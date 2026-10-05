---
name: keep
description: Copy a library image into the current project (for git / sharing) and star it. /img:keep <id> [destination]
argument-hint: "<id> [destination path]"
disable-model-invocation: true
allowed-tools: mcp__plugin_img_images__export_image
---

Arguments: $ARGUMENTS

1. The first word is the image id ("last" allowed). The optional rest is the destination file or directory.
2. Without a destination, pick the project's natural place for images (an existing assets/, public/, static/ or
   images/ directory; otherwise ./assets/) and use a descriptive file name.
3. Call export_image. Report the path in one line, and use that project path (not the library path) whenever the image
   is referenced in files that get committed.
