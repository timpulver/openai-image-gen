---
name: img
description: Shortcut for the img plugin. /img [id] [count] <prompt>: refines when it starts with an image id, otherwise generates new images.
argument-hint: "[id] [count] <prompt>"
disable-model-invocation: true
allowed-tools: mcp__plugin_img_images__generate_images, mcp__plugin_img_images__inspect_image, mcp__plugin_img_images__list_images
---

Request: $ARGUMENTS

1. If the first word is an image id (4 characters mixing letters and digits, e.g. k7f2 or img:k7f2) or "last", this is a
   refinement: from=<that id>. Otherwise it is a new image (no from).
2. Next, an optional number (1–8) is the variation count ("4 minimalist otter logo" → count 4). The rest is the prompt.
3. Pasted images ("[Image #N]") → refs "paste:N", or their file path if one is shown ("[Image: source: …]"); image file paths or URLs → refs (absolute paths).
4. Call generate_images with show=true. Reply briefly: gallery link, then one line per image (id + honest assessment).
