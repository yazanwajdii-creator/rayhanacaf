Keystore Info - ريحانة كافيه
==============================
File:      rayhanacafe.keystore
Alias:     rayhanacafe
Passwords: rayhanacafe123 (both store & key)
Validity:  10,000 days (~27 years)
Algorithm: RSA 2048

IMPORTANT: Keep this file safe. Use the same keystore for all future
app updates so users can update without uninstalling.

For manual build:
  java -jar apksigner.jar sign \
    --ks rayhanacafe.keystore \
    --ks-pass pass:rayhanacafe123 \
    --key-pass pass:rayhanacafe123 \
    --ks-key-alias rayhanacafe \
    --out output.apk input.apk
