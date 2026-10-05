---
name: model
description: Show or change the default image model and mainline model (persists across sessions and Macs). /img:model [name]
argument-hint: "[image or mainline model name]"
disable-model-invocation: true
allowed-tools: mcp__plugin_img_images__image_settings, mcp__plugin_img_images__list_image_models
---

Arguments: $ARGUMENTS

- No arguments: call image_settings (no changes) and list_image_models. Show the current image model and mainline
  model, and the available image models, in a compact list.
- With a name: call list_image_models to resolve it. Short names match the full id ("flare" → the gpt-image-…-flare
  model). Image models (ids containing "image") set imageModel, anything else sets mainlineModel.
  Then call image_settings to save it and confirm in one line.
- Other settings (size, quality, format, background) can be set the same way when asked, e.g. "quality high".
