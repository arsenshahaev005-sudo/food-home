#!/usr/bin/env python
"""Remove all gift-related views from views.py"""

gift_views = [
    'GiftCreateView',
    'GiftBulkCreateView',
    'GiftPreviewView',
    'GiftActivateView',
    'GiftCancelView',
    'GiftStatusView',
    'GiftMyListView',
    'GiftStatsView',
    'GiftNotificationSettingsView',
]

with open('api/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
result_lines = []
skip_until_next_class = False

for i, line in enumerate(lines):
    # Check if this line starts a gift view
    if line.strip().startswith('class '):
        class_name = line.strip().split('(')[0].replace('class ', '')
        if class_name in gift_views:
            skip_until_next_class = True
            continue
    
    # Skip lines until we find the next view (not gift-related)
    if skip_until_next_class:
        if line.strip().startswith('class '):
            # Check if this is another gift view
            class_name = line.strip().split('(')[0].replace('class ', '')
            if class_name in gift_views:
                continue
            else:
                skip_until_next_class = False
                result_lines.append(line)
        continue
    
    # If we're not in a gift view, keep line
    if not skip_until_next_class:
        result_lines.append(line)

# Write back
with open('api/views.py', 'w', encoding='utf-8') as f:
    f.write('\n'.join(result_lines))

print(f'Removed {len(gift_views)} gift views')
