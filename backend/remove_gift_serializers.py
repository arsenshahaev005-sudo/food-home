#!/usr/bin/env python
"""Remove all gift-related serializers from serializers.py"""

gift_serializers = [
    'GiftProductSerializer',
    'GiftCreateSerializer',
    'GiftSerializer',
    'GiftPreviewSerializer',
    'GiftActivateSerializer',
    'GiftStatusSerializer',
]

with open('api/serializers.py', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
result_lines = []
skip_until_next_class = False

for i, line in enumerate(lines):
    # Check if this line starts a gift serializer
    if line.strip().startswith('class '):
        class_name = line.strip().split('(')[0].replace('class ', '')
        if class_name in gift_serializers:
            skip_until_next_class = True
            continue
    
    # Skip lines until we find the next serializer (not gift-related)
    if skip_until_next_class:
        if line.strip().startswith('class '):
            # Check if this is another gift serializer
            class_name = line.strip().split('(')[0].replace('class ', '')
            if class_name in gift_serializers:
                continue
            else:
                skip_until_next_class = False
                result_lines.append(line)
        continue
    
    # If we're not in a gift serializer, keep line
    if not skip_until_next_class:
        result_lines.append(line)

# Write back
with open('api/serializers.py', 'w', encoding='utf-8') as f:
    f.write('\n'.join(result_lines))

print(f'Removed {len(gift_serializers)} gift serializers')
