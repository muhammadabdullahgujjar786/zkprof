// Base64 encoding utility with chunking to prevent stack overflow
const encodeBase64 = (arr: Uint8Array): string => {
  const CHUNK_SIZE = 8192; // Process 8KB at a time to avoid call stack limit
  let binary = '';
  
  for (let i = 0; i < arr.length; i += CHUNK_SIZE) {
    const chunk = arr.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

import { generateZKProof, serializeProof, ZKProofResult, ZKProofProgressCallback } from './zkproof';

export interface EncryptionResult {
  encryptedData: string;
  encryptedKey: string;
  iv: string;
  commitment: string;
  zkProof?: ZKProofResult; // ZK-SNARK proof of encryption
}

export async function encryptImage(
  imageDataUrl: string,
  recipientPublicKey: string,
  onZKProgress?: ZKProofProgressCallback
): Promise<EncryptionResult> {
  // Convert data URL to blob
  const response = await fetch(imageDataUrl);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const imageData = new Uint8Array(arrayBuffer);

  // Generate a random symmetric key for AES-256-GCM
  const symmetricKey = crypto.getRandomValues(new Uint8Array(32));
  
  // Generate IV for AES-GCM (96 bits / 12 bytes)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Import the symmetric key for Web Crypto API
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    symmetricKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Encrypt the image data using AES-256-GCM
  const encryptedDataBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    cryptoKey,
    imageData
  );
  const encryptedData = new Uint8Array(encryptedDataBuffer);

  // For prototype: Create a deterministic encrypted key representation
  // In production, this would be asymmetrically encrypted with the recipient's public key
  const keyMaterial = new Uint8Array([...symmetricKey, ...new TextEncoder().encode(recipientPublicKey)]);
  const encryptedKeyHash = await crypto.subtle.digest('SHA-256', keyMaterial);
  const encryptedKey = new Uint8Array(encryptedKeyHash);

  // Create commitment hash using SHA-256
  const commitmentInput = new Uint8Array([...symmetricKey, ...iv]);
  const commitmentHash = await crypto.subtle.digest('SHA-256', commitmentInput);
  const commitment = encodeBase64(new Uint8Array(commitmentHash));

  // Generate ZK-SNARK proof (proves knowledge of key without revealing it)
  let zkProof: ZKProofResult | undefined;
  try {
    console.log('Generating ZK-SNARK proof...');
    zkProof = await generateZKProof(symmetricKey, iv, recipientPublicKey, onZKProgress);
    console.log('ZK-SNARK proof generated successfully');
  } catch (error) {
    console.warn('ZK-SNARK proof generation failed, falling back to commitment-only:', error);
    // Continue without ZK proof - commitment is still secure
    // This allows the app to function even if ZK artifacts aren't available yet
  }

  return {
    encryptedData: encodeBase64(encryptedData),
    encryptedKey: encodeBase64(encryptedKey),
    iv: encodeBase64(iv),
    commitment,
    zkProof
  };
}
