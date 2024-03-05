import { fromHexString, toHexString } from "@pcd/util";
import {
  Point,
  packPoint as zkkPackPoint,
  unpackPoint as zkkUnpackPoint
} from "@zk-kit/baby-jubjub";
import {
  Signature,
  derivePublicKey,
  signMessage,
  verifySignature
} from "@zk-kit/eddsa-poseidon";
import {
  BigNumber,
  bigNumberishToBigint,
  leBigintToBuffer,
  leBufferToBigint
} from "@zk-kit/utils";
import { sha256 } from "js-sha256";
import { poseidon1 } from "poseidon-lite/poseidon1";
import { poseidon2 } from "poseidon-lite/poseidon2";
import { PODValue } from "./podTypes";
import {
  checkPrivateKeyFormat,
  checkPublicKeyFormat,
  checkSignatureFormat
} from "./podUtil";

function podStringHash(input: string): bigint {
  // TODO(artwyman): Finalize choice of hash for POD names and string values.
  return BigInt("0x" + sha256(input)) >> 8n;
}

function podIntHash(input: bigint): bigint {
  // TODO(artwyman): Finalize choice of hash for POD integer values.
  return poseidon1([input]);
}

export function podNameHash(podName: string): bigint {
  return podStringHash(podName);
}

export function podValueHash(podValue: PODValue): bigint {
  switch (podValue.type) {
    case "string":
      return podStringHash(podValue.value);
    case "int":
    case "cryptographic":
      // TODO(artwyman): Finalize choice of hash for POD cryptographics.
      return podIntHash(podValue.value);
  }
}

export function podMerkleTreeHash(left: bigint, right: bigint): bigint {
  return poseidon2([left, right]);
}

export function packPoint(unpackedPoint: Point<BigNumber>): bigint {
  const zkkPackedPoint = zkkPackPoint([
    BigInt(unpackedPoint[0]),
    BigInt(unpackedPoint[1])
  ]);
  // zk-kit/baby-jubjub's packPoint reverses byte order when compared to
  // the raw point (and compared to circomlibjs).  Reverse it back manually.
  // TODO(artwyman): This has been fixed in zk-kit.  Incorporate it when released.
  return leBufferToBigint(leBigintToBuffer(zkkPackedPoint).reverse());
}

export function unpackPoint(packedPoint: BigNumber): Point<bigint> | null {
  // zk-kit/baby-jubjub's packPoint reverses byte order when compared to
  // the raw point (and compared to circomlibjs).  Reverse it back manually.
  // TODO(artwyman): This has been fixed in zk-kit.  Incorporate it when released.
  const zkkPackedPoint = leBufferToBigint(
    leBigintToBuffer(BigInt(packedPoint)).reverse()
  );
  const unpackedPoint = zkkUnpackPoint(zkkPackedPoint);
  return unpackedPoint;
}

// TODO(artwyman): Submit this to zk-kit/eddsa-poseidon
export function packSignature(rawSignature: Signature): string {
  const numericSignature: Signature<bigint> = {
    R8: rawSignature.R8.map((c) => bigNumberishToBigint(c)) as Point<bigint>,
    S: bigNumberishToBigint(rawSignature.S)
  };
  const packedR8 = packPoint(numericSignature.R8);
  const packedBytes = Buffer.alloc(64);
  packedBytes.set(leBigintToBuffer(packedR8), 0);
  packedBytes.set(leBigintToBuffer(numericSignature.S), 32);
  return toHexString(packedBytes);
}

// TODO(artwyman): Submit this to zk-kit/eddsa-poseidon
export function unpackSignature(packedSigHex: string): Signature<bigint> {
  const packedBytes = Buffer.from(checkSignatureFormat(packedSigHex), "hex");
  const sliceR8 = packedBytes.subarray(0, 32);
  const sliceS = packedBytes.subarray(32, 64);
  const unpackedR8 = unpackPoint(leBufferToBigint(sliceR8));
  if (unpackedR8 === null) {
    throw new Error(`Invalid packed signature point ${toHexString(sliceS)}.`);
  }
  return {
    R8: unpackedR8,
    S: leBufferToBigint(sliceS)
  };
}

// TODO(artwyman): Decide whether to use zk-kit/eddsa-poseidon's packPublicKey,
// which uses a decimal format rather than hex.
export function packPublicKey(unpackedPublicKey: Point<BigNumber>): string {
  return toHexString(leBigintToBuffer(packPoint(unpackedPublicKey)));
}

// TODO(artwyman): Decide whetehr to use zk-kit/eddsa-poseidon's unpackPublicKey,
// which uses a decimal format rather than hex.
export function unpackPublicKey(packedPublicKey: string): Point<bigint> {
  const unpackedPublicKey = unpackPoint(
    leBufferToBigint(fromHexString(checkPublicKeyFormat(packedPublicKey)))
  );
  if (unpackedPublicKey === null) {
    throw new Error(`Invalid packed public key point ${packedPublicKey}.`);
  }
  return unpackedPublicKey;
}

export function unpackPrivateKey(packedPrivateKey: string): Buffer {
  return fromHexString(checkPrivateKeyFormat(packedPrivateKey));
}

export function signPODRoot(
  root: bigint,
  privateKey: string
): { signature: string; publicKey: string } {
  const privateKeyBytes = unpackPrivateKey(privateKey);
  const signature = packSignature(signMessage(privateKeyBytes, root));
  const publicKey = packPublicKey(derivePublicKey(privateKeyBytes));

  return { signature, publicKey };
}

export function verifyPODRootSignature(
  root: bigint,
  signature: string,
  publicKey: string
): boolean {
  const unpackedPublicKey = unpackPublicKey(publicKey);
  const unpackedSignature = unpackSignature(signature);
  return verifySignature(root, unpackedSignature, unpackedPublicKey);
}
