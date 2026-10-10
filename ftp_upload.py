import ftplib
import os

SERVER = '80.69.62.106'
USER = 'tofiqsit'
PASS = 'f*hyWTz9EqHq#K'

def upload_dir(ftp, local_dir, remote_dir):
    try:
        ftp.mkd(remote_dir)
    except Exception as e:
        pass
        
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        
        if os.path.isfile(local_path):
            print(f"Uploading {local_path} to {remote_path}...")
            with open(local_path, 'rb') as f:
                ftp.storbinary(f"STOR {remote_path}", f)
        elif os.path.isdir(local_path):
            upload_dir(ftp, local_path, remote_path)

ftp = ftplib.FTP(SERVER, USER, PASS)
ftp.set_pasv(False)
print('Connected in ACTIVE mode.')
upload_dir(ftp, 'dist', 'domains/tofiq.site/public_html')
print('Upload complete.')
ftp.quit()
