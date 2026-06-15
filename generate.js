const cloudinary = require("cloudinary").v2;
const fs = require("fs");

let localKeys = {};

try {
  localKeys = JSON.parse(fs.readFileSync("local_keys.json", "utf8"));
} catch (err) {
  console.warn("local_keys.json not found, using environment variables only.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || localKeys.cloud_name,
  api_key: process.env.CLOUDINARY_API_KEY || localKeys.api_key,
  api_secret: process.env.CLOUDINARY_API_SECRET || localKeys.api_secret,
});

const TARGET_FOLDER = "KOFAC GLOBAL LTD";

async function fetchAllResourcesByType(resourceType) {
  let all = [];
  let nextCursor = null;

  try {
    do {
      const result = await cloudinary.api.resources({
        type: "upload",
        resource_type: resourceType,
        max_results: 100,
        next_cursor: nextCursor,
      });

      all = all.concat(result.resources);
      nextCursor = result.next_cursor;
    } while (nextCursor);
  } catch (err) {
    console.error(`Error fetching ${resourceType}:`, err.message);
  }

  return all;
}

async function generateManifest() {
  console.log("Fetching all images...");
  const allImages = await fetchAllResourcesByType("image");

  console.log("Fetching all videos...");
  const allVideos = await fetchAllResourcesByType("video");

  const allMedia = [...allImages, ...allVideos];

  const folderPrefix = TARGET_FOLDER + "/";
  const filtered = allMedia.filter((media) =>
    media.public_id.startsWith(folderPrefix),
  );

  if (filtered.length === 0) {
    console.error(`❌ No media found starting with "${folderPrefix}".`);

    console.log(
      'Here are all public_ids that contain "KOFAC" (for debugging):',
    );

    allMedia
      .filter((m) => m.public_id.includes("KOFAC"))
      .forEach((m) => console.log(`  - ${m.public_id}`));

    return;
  }

  const manifest = filtered.map((r) => ({
    public_id: r.public_id,
    resource_type: r.resource_type,
  }));

  fs.writeFileSync("media-list.json", JSON.stringify(manifest, null, 2));

  console.log(
    `✅ Success! Saved ${manifest.length} media items to media-list.json`,
  );

  console.log(
    `   (images: ${filtered.filter((m) => m.resource_type === "image").length}, videos: ${filtered.filter((m) => m.resource_type === "video").length})`,
  );
}

generateManifest();
