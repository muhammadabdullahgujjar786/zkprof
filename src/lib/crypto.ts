import nacl from 'tweetnacl';

// Base64 encoding/decoding utilities
const encodeBase64 = (arr: Uint8Array): string => {
  return btoa(String.fromCharCode.apply(null, Array.from(arr)));
};

const decodeBase64 = (str: string): Uint8Array => {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
};

export interface EncryptionResult {
  encryptedData: string;
  encryptedKey: string;
  iv: string;
  commitment: string;
}

export async function encryptImage(
  imageDataUrl: string,
  recipientPublicKey: string
): Promise<EncryptionResult> {
  // Convert data URL to blob
  const response = await fetch(imageDataUrl);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const imageData = new Uint8Array(arrayBuffer);

  // Generate a random symmetric key for AES-256-GCM simulation
  const symmetricKey = nacl.randomBytes(32);
  
  // Generate IV
  const iv = nacl.randomBytes(12);

  // Encrypt the image data (using XOR for simplicity in this demo)
  const encryptedData = new Uint8Array(imageData.length);
  for (let i = 0; i < imageData.length; i++) {
    encryptedData[i] = imageData[i] ^ symmetricKey[i % symmetricKey.length];
  }

  // Encrypt the symmetric key with recipient's public key
  const recipientPubKeyBytes = decodeBase64(recipientPublicKey);
  const ephemeralKeyPair = nacl.box.keyPair();
  const nonce = nacl.randomBytes(24);
  
  const encryptedKey = nacl.box(
    symmetricKey,
    nonce,
    recipientPubKeyBytes,
    ephemeralKeyPair.secretKey
  );

  // Create commitment hash (SHA-256 simulation)
  const commitmentInput = new Uint8Array([...symmetricKey, ...iv]);
  const commitment = encodeBase64(nacl.hash(commitmentInput).slice(0, 32));

  return {
    encryptedData: encodeBase64(encryptedData),
    encryptedKey: encodeBase64(new Uint8Array([...ephemeralKeyPair.publicKey, ...nonce, ...encryptedKey])),
    iv: encodeBase64(iv),
    commitment
  };
}
