from Crypto.Cipher import AES
import base64

AES_KEY = b"1234567890abcdef"  # 16 байт

def encrypt_message(message: str) -> str:
    cipher = AES.new(AES_KEY, AES.MODE_EAX)
    ciphertext, tag = cipher.encrypt_and_digest(message.encode())
    result = cipher.nonce + tag + ciphertext
    return base64.b64encode(result).decode()

def decrypt_message(encrypted: str) -> str:
    raw = base64.b64decode(encrypted)
    nonce, tag, ciphertext = raw[:16], raw[16:32], raw[32:]
    cipher = AES.new(AES_KEY, AES.MODE_EAX, nonce=nonce)
    return cipher.decrypt_and_verify(ciphertext, tag).decode()
