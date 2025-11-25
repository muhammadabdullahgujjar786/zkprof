# ZK-SNARK Artifacts Generation Guide

This guide explains how to generate the trusted setup artifacts needed for zkPFP's ZK-SNARK proofs.

## Prerequisites

Install Circom and snarkjs:
```bash
npm install -g circom
npm install -g snarkjs
```

Install circomlib for SHA-256 circuits:
```bash
npm install circomlib
```

## Step 1: Compile the Circuit

```bash
# Compile the circuit to generate R1CS and WASM
circom circuits/zkpfp.circom --r1cs --wasm --sym -o build/circuits

# This generates:
# - build/circuits/zkpfp.r1cs (constraint system)
# - build/circuits/zkpfp.wasm (witness calculator)
# - build/circuits/zkpfp.sym (symbols for debugging)
```

## Step 2: Powers of Tau Ceremony

For production, you should contribute to a Powers of Tau ceremony. For development, you can use a phase1:

```bash
# Start new ceremony (only needed once)
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v

# Contribute to the ceremony (can do multiple contributions)
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution" -v

# Prepare phase 2
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v
```

**Note**: The number `14` means the ceremony can handle circuits with up to 2^14 = 16,384 constraints. Adjust if needed.

## Step 3: Generate Proving and Verification Keys

```bash
# Generate proving key (.zkey)
snarkjs groth16 setup build/circuits/zkpfp.r1cs pot14_final.ptau zkpfp_0000.zkey

# Contribute to the phase 2 ceremony (adds randomness)
snarkjs zkey contribute zkpfp_0000.zkey zkpfp_final.zkey --name="Phase 2 contribution" -v

# Export verification key (for verifying proofs)
snarkjs zkey export verificationkey zkpfp_final.zkey verification_key.json
```

## Step 4: Copy Artifacts to Public Directory

```bash
# Create public directory for ZK artifacts
mkdir -p public/zk-artifacts

# Copy WASM and proving key (needed by browser)
cp build/circuits/zkpfp.wasm public/zk-artifacts/
cp zkpfp_final.zkey public/zk-artifacts/

# Copy verification key (for proof verification)
cp verification_key.json public/zk-artifacts/
```

## Step 5: Verify Setup (Optional but Recommended)

```bash
# Generate a test proof to verify everything works
snarkjs groth16 fullprove input.json build/circuits/zkpfp.wasm zkpfp_final.zkey proof.json public.json

# Verify the test proof
snarkjs groth16 verify verification_key.json public.json proof.json
```

## File Sizes

Expected artifact sizes:
- `zkpfp.wasm`: ~500KB - 2MB (witness calculator)
- `zkpfp_final.zkey`: ~5-20MB (proving key)
- `verification_key.json`: ~1KB (verification key)

## Production Considerations

1. **Trusted Setup**: For production, participate in or organize a multi-party computation (MPC) ceremony where multiple participants contribute randomness. This ensures no single party can forge proofs.

2. **Security**: The ceremony artifacts (`pot14_final.ptau`, `zkpfp_final.zkey`) should be generated in a secure environment and verified by multiple parties.

3. **Versioning**: Tag and version your circuits. Any circuit change requires regenerating all artifacts.

4. **CDN Hosting**: Host large artifacts on a CDN for faster loading in production.

## Integration with Frontend

Once artifacts are generated and placed in `public/zk-artifacts/`, the `src/lib/crypto.ts` module will automatically load them when generating proofs.

## Troubleshooting

- **"Out of memory" errors**: Increase Node.js heap size: `export NODE_OPTIONS="--max-old-space-size=8192"`
- **Circuit too large**: Reduce constraint count or increase Powers of Tau degree
- **Slow proof generation**: Consider using faster curves or optimizing circuit constraints
