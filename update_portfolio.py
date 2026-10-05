import re

with open('index.html', 'r') as f:
    content = f.read()

# 1. Remove WhatsApp
content = re.sub(r'<a href="https://wa\.me.*?</a>\s*', '', content, flags=re.DOTALL)
# 2. Remove LinkedIn
content = re.sub(r'<a href="https://www\.linkedin\.com.*?</a>\s*', '', content, flags=re.DOTALL)
# 3. Add m3-button class to remaining action buttons
content = content.replace('class="bento-link-btn"', 'class="bento-link-btn m3-button"')
content = content.replace('class="bento-link-btn btn-primary-cv"', 'class="bento-link-btn btn-primary-cv m3-button"')
# 4. Remove High School
edu_start = content.find('<div class="edu-entry">\n          <h3 class="edu-title">High School Diploma</h3>')
if edu_start != -1:
    edu_end = content.find('</div>\n      </section>', edu_start)
    if edu_end != -1:
        content = content[:edu_start] + content[edu_end:]

# 5. Remove Switcher script
content = content.replace('<script src="js/switcher.js"></script>', '')
content = content.replace('<link rel="stylesheet" href="css/switcher.css">', '')

with open('index.html', 'w') as f:
    f.write(content)
