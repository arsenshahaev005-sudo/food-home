#!/usr/bin/env python
"""Remove gift_service import from views.py"""

with open('api/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
result_lines = []

for i, line in enumerate(lines):
    # Skip lines 99-101 (gift_service import)
    if i >= 99 and i <= 101:
        continue
    result_lines.append(line)

# Write back
with open('api/views.py', 'w', encoding='utf-8') as f:
    f.write('\n'.join(result_lines))

print('Removed gift_service import')
