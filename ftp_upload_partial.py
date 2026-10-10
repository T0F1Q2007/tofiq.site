import ftplib

SERVER = '80.69.62.106'
USER = 'tofiqsit'
PASS = 'f*hyWTz9EqHq#K'

files = [
    ('dist/index.html', 'domains/tofiq.site/public_html/index.html'),
    ('dist/css/minimal.css', 'domains/tofiq.site/public_html/css/minimal.css')
]

ftp = ftplib.FTP(SERVER, USER, PASS)
ftp.set_pasv(False)
print('Connected in ACTIVE mode.')

for local_path, remote_path in files:
    print(f"Uploading {local_path} to {remote_path}...")
    with open(local_path, 'rb') as f:
        ftp.storbinary(f"STOR {remote_path}", f)
        
print('Upload complete.')
ftp.quit()
