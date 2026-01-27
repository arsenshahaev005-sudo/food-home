#!/usr/bin/env python
"""Remove all gift-related URLs from urls.py"""

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
    'OrderUpdateGiftDetailsView',
]

with open('api/urls.py', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
result_lines = []

for i, line in enumerate(lines):
    # Skip gift view imports
    if any(view in line for view in gift_views):
        continue
    # Skip gift URL paths
    if 'gifts/' in line.lower() or 'update_gift_details' in line.lower():
        continue
    result_lines.append(line)

# Write back
with open('api/urls.py', 'w', encoding='utf-8') as f:
    f.write('\n'.join(result_lines))

print('Removed gift-related URLs from urls.py')
