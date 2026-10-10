#!/bin/bash
USER="tofiqsit"
PASS="f*hyWTz9EqHq#K"
SERVER="ftp://80.69.62.106/domains/tofiq.site/public_html"

upload_file() {
    local file=$1
    echo "Uploading $file..."
    curl -u "$USER:$PASS" -P - --ftp-create-dirs -T "dist/$file" "$SERVER/$file"
}

upload_file "index.html"
upload_file "css/minimal.css"
upload_file "js/ascii-magic.js"
upload_file "assets/profile.jpg"
upload_file "assets/profile_ascii_color.png"
upload_file "assets/profile_ascii_emerald.png"
upload_file "assets/profile_ascii_mono.png"

echo "Done"
