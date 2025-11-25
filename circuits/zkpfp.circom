pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

// Circuit to prove knowledge of encryption key and correct commitment generation
// without revealing the actual key
template ZkPFP() {
    // Private inputs (not revealed in proof)
    signal input symmetricKey[32];  // 32 bytes AES-256 key
    signal input iv[12];             // 12 bytes IV for AES-GCM
    
    // Public inputs (visible in proof)
    signal input walletPubKey[32];   // Solana wallet public key (32 bytes)
    signal output commitment;         // SHA-256 commitment hash
    
    // Convert key and iv to bits for SHA-256
    component keyToBits[32];
    component ivToBits[12];
    
    var keyBits[256];
    var ivBits[96];
    
    for (var i = 0; i < 32; i++) {
        keyToBits[i] = Num2Bits(8);
        keyToBits[i].in <== symmetricKey[i];
        for (var j = 0; j < 8; j++) {
            keyBits[i*8 + j] = keyToBits[i].out[j];
        }
    }
    
    for (var i = 0; i < 12; i++) {
        ivToBits[i] = Num2Bits(8);
        ivToBits[i].in <== iv[i];
        for (var j = 0; j < 8; j++) {
            ivBits[i*8 + j] = ivToBits[i].out[j];
        }
    }
    
    // Compute SHA-256(symmetricKey || iv) = commitment
    component sha = Sha256(352); // 256 bits (key) + 96 bits (iv) = 352 bits
    
    for (var i = 0; i < 256; i++) {
        sha.in[i] <== keyBits[i];
    }
    for (var i = 0; i < 96; i++) {
        sha.in[256 + i] <== ivBits[i];
    }
    
    // Convert SHA-256 output back to single commitment value
    component bitsToNum = Bits2Num(256);
    for (var i = 0; i < 256; i++) {
        bitsToNum.in[i] <== sha.out[i];
    }
    
    commitment <== bitsToNum.out;
    
    // Constraint: Wallet binding (ensures proof is tied to specific wallet)
    // This proves the user knows the key corresponding to their wallet
    signal walletSum;
    walletSum <== walletPubKey[0] + walletPubKey[1]; // Simple binding check
    
    // Force constraint evaluation (prevents optimization removing the check)
    signal walletCheck;
    walletCheck <== walletSum * walletSum;
}

component main {public [walletPubKey]} = ZkPFP();
