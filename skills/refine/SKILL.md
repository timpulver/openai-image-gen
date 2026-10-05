---
name: refine
description: Iterate on an earlier image. /img:refine [id] [count] <what to change>. Without an id, refines the last image.
argument-hint: "[id] [count] <what to change>"
disable-model-invocation: true
allowed-tools: mcp__plugin_img_images__generate_images, mcp__plugin_img_images__inspect_image, mcp__plugin_img_images__list_images
---

Refine an image: $ARGUMENTS

1. If the first word is an image id (4 characters mixing letters and digits, e.g. k7f2, optionally written img:k7f2)
   or "last", it is the parent. Otherwise the parent is "last".
2. Next, an optional number (1–8) is the variation count. The rest describes the change.
3. Pasted images ("[Image #N]") → refs "paste:N", or their file path if one is shown ("[Image: source: …]"); image file paths or URLs → refs (absolute paths).
4. Call generate_images with from=<parent>, show=true. If "last" is ambiguous (the last batch had several images),
   ask which one.
5. Reply briefly: the gallery link, then one line per image: id and what changed, judged from the preview.
