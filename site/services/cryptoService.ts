// Helper to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Helper to convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

// ---- Password-based Encryption for Private Key ----

// Derives a key from a password using PBKDF2 for use with AES-GCM
const deriveKeyFromPassword = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const passwordBuffer = new TextEncoder().encode(password);
  const importedKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypts the private key string using a password.
 * Uses AES-GCM with a key derived from the password via PBKDF2.
 * The salt and IV are prepended to the ciphertext.
 */
export const encryptPrivateKey = async (privateKeyString: string, password: string): Promise<string> => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassword(password, salt);
  
  const privateKeyBuffer = new TextEncoder().encode(privateKeyString);
  
  const encryptedPrivateKeyBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    privateKeyBuffer
  );
  
  // Combine salt, iv, and ciphertext into a single buffer
  const combinedBuffer = new Uint8Array(salt.length + iv.length + encryptedPrivateKeyBuffer.byteLength);
  combinedBuffer.set(salt, 0);
  combinedBuffer.set(iv, salt.length);
  combinedBuffer.set(new Uint8Array(encryptedPrivateKeyBuffer), salt.length + iv.length);
  
  return arrayBufferToBase64(combinedBuffer.buffer);
};

/**
 * Decrypts an encrypted private key string using a password.
 * It assumes the key was encrypted with `encryptPrivateKey`.
 */
export const decryptPrivateKey = async (encryptedPrivateKeyBase64: string, password: string): Promise<string> => {
  try {
    const combinedBuffer = base64ToArrayBuffer(encryptedPrivateKeyBase64);
    
    // Extract salt, iv, and ciphertext from the combined buffer
    const salt = new Uint8Array(combinedBuffer, 0, 16);
    const iv = new Uint8Array(combinedBuffer, 16, 12);
    const encryptedPrivateKeyBuffer = new Uint8Array(combinedBuffer, 28);
    
    const key = await deriveKeyFromPassword(password, salt);
    
    const decryptedPrivateKeyBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedPrivateKeyBuffer
    );
    
    return new TextDecoder().decode(decryptedPrivateKeyBuffer);
  } catch(error) {
      console.error("Failed to decrypt private key. This might be due to an incorrect password.", error);
      throw new Error("Не удалось расшифровать ключ. Проверьте правильность пароля.");
  }
};


// ---- RSA Encryption for Messages ----

// Generates an RSA key pair
export const generateKeyPair = async (): Promise<{ publicKey: string, privateKey: string }> => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKey),
    privateKey: arrayBufferToBase64(privateKey),
  };
};

// Imports a public key from a base64 string
const importPublicKey = async (key: string): Promise<CryptoKey> => {
  const buffer = base64ToArrayBuffer(key);
  return window.crypto.subtle.importKey(
    'spki',
    buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  );
};

// Imports a private key from a base64 string
const importPrivateKey = async (key: string): Promise<CryptoKey> => {
  const buffer = base64ToArrayBuffer(key);
  return window.crypto.subtle.importKey(
    'pkcs8',
    buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  );
};

// Encrypts a message with a public key
export const encryptMessage = async (publicKeyString: string, message: string): Promise<string> => {
  const publicKey = await importPublicKey(publicKeyString);
  const encodedMessage = new TextEncoder().encode(message);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    encodedMessage
  );
  return arrayBufferToBase64(encryptedBuffer);
};

// Decrypts a message with a private key
export const decryptMessage = async (privateKeyString: string, encryptedMessage: string): Promise<string> => {
  try {
    const privateKey = await importPrivateKey(privateKeyString);
    const encryptedBuffer = base64ToArrayBuffer(encryptedMessage);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedBuffer
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    return "Не удалось расшифровать сообщение.";
  }
};
