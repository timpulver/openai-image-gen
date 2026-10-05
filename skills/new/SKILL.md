---
name: new
description: Generate new images with OpenAI. /img:new [count] <prompt>, optionally with pasted images or file paths as references.
argument-hint: "[count] <prompt> [pasted images / file paths]"
disable-model-invocation: true
allowed-tools: mcp__plugin_img_images__generate_images, mcp__plugin_img_images__inspect_image
---

Generate images for this request: $ARGUMENTS

1. A leading number (1–8) is the variation count; the rest is the prompt. No number means 1.
   "4 minimalist otter logo" → count 4, prompt "minimalist otter logo".
2. References: pasted images ("[Image #N]") → refs "paste:N", or the file path if the image shows a source path. Image file paths or URLs → refs (make paths absolute).
   Image ids like k7f2 or img:k7f2 used as style/content references → refs.
3. Call generate_images with show=true.
4. Reply briefly: the gallery link, then one line per image: its id and an honest one-line assessment based on the preview.
