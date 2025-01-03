import { sleep } from "bun";
import { randomInt } from "crypto";
import fs from "fs";
import path from "path";

// 이미지 합성을 위한 라이브러리 : sharp
import sharp from "sharp";

const stack: string[] = ["face", "top", "bottom"];

function getTypePathMap() {
  // images 내부에는 bomm, face, top 이라는 디렉토리가 존재한다.
  // 이 각 디렉토리에는 이미지 파일이 존재한다
  // 각 디렉토리 내부의 png 이미지 파일의 이름과 상대 경로를 출력하시오
  // 단, png 파일만 출력하도록 한다.
  const imagesDir = path.join(__dirname, "../images");

  const dirs = fs.readdirSync(imagesDir);

  const types: {
    [key in (typeof stack)[number]]: string[];
  } = {};

  dirs.forEach((dir) => {
    const dirPath = path.join(imagesDir, dir);
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      if (file.endsWith(".png")) {
        // 각 타입별 파일 경로 저장
        if (types[dir as (typeof stack)[number]]) {
          types[dir as (typeof stack)[number]].push(path.join(dir, file));
        } else {
          types[dir as (typeof stack)[number]] = [path.join(dir, file)];
        }
      }
    });
  });

  return types;
}

async function composeImage(typeMap: {
  [key in (typeof stack)[number]]: string[];
}) {
  // face, top, bottom 이미지를 합성하여 새로운 이미지를 생성하기위한
  // 모든 경우의 수를 출력하시오
  // 형식은 {face: "face.png", top: "top.png", bottom: "bottom.png"}[] 형식으로 출력하시오

  const result = [];

  for (const face of typeMap.face) {
    for (const top of typeMap.top) {
      for (const bottom of typeMap.bottom) {
        result.push({ face, top, bottom });
      }
    }
  }

  return result;
}

async function scrambleImage(
  images: { face: string; top: string; bottom: string }[]
) {
  // 배열을 랜덤하게 섞어서 반환하는 함수를 구현하시오

  const result = [...images];

  for (let i = 0; i < result.length; i++) {
    const j = randomInt(i, result.length);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

async function saveImagesToJSON(
  images: { face: string; top: string; bottom: string }[]
) {
  if (!fs.existsSync(path.join(__dirname, "../output/orders"))) {
    fs.mkdirSync(path.join(__dirname, "../output/orders"), { recursive: true });
  }

  const jsonPath = path.join(__dirname, "../output/orders/images.json");

  fs.writeFileSync(jsonPath, JSON.stringify(images, null, 2));
}

async function loadImagesFromJSON() {
  const jsonPath = path.join(__dirname, "../output/orders/images.json");

  return JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
}

async function saveImageToPNG(
  image: { face: string; top: string; bottom: string },
  index: number
) {
  const outputDir = path.join(__dirname, "../output/images");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const imagesDir = path.join(__dirname, "../images");

  // 각 이미지를 읽어옵니다.
  const facePath = path.join(imagesDir, image.face);
  const topPath = path.join(imagesDir, image.top);
  const bottomPath = path.join(imagesDir, image.bottom);

  const outputPath = path.join(outputDir, `${index + 1}.png`);

  try {
    // `sharp`를 사용하여 이미지 합성
    const faceImage = sharp(facePath);
    const topImage = sharp(topPath);
    const bottomImage = sharp(bottomPath);

    const faceMetadata = await faceImage.metadata();
    const topResized = await topImage
      .resize(faceMetadata.width, faceMetadata.height)
      .toBuffer();
    const bottomResized = await bottomImage
      .resize(faceMetadata.width, faceMetadata.height)
      .toBuffer();

    await faceImage
      .composite([
        { input: topResized, top: 0, left: 0 },
        { input: bottomResized, top: 0, left: 0 },
      ])
      .toFile(outputPath);

    console.log(`Saved: ${outputPath}`);
  } catch (error) {
    console.error(`Failed to save image ${index}:`, error);
  }
}

async function generateImage() {
  const typeMap = getTypePathMap();
  const result = await composeImage(typeMap);
  const scrambled = await scrambleImage(result);
  await saveImagesToJSON(scrambled);
}

async function generateMetadataFile(
  images: { face: string; top: string; bottom: string }[],
  index: number
) {
  const metadata = {
    name: `Bomm #${index + 1}`,
    description:
      "Meow dia~ Hi there! I'm Bomm(봄이), the cutest little ragdoll fluff you'll ever meet! 🐾 I was born on 2020.2.24, and my purr-fect life with my family began on 2020.4.10. I'm super playful and totally lovable—just ask anyone! Oh, and I share my cozy home with my bestie, Kong-ee(콩이). We have so much fun together! Purr~ 😽",
    external_url: "https://www.instagram.com/cat__bomkong/profilecard",
    image: `ipfs://bafybeicsan7qpqccimr7ppt3d27jl343kj6tfuyuepbnucyjzrag6tl6ym/${
      index + 1
    }.png`,
    attributes: [] as { trait_type: string; value: string }[],
  };

  metadata.attributes.push({
    trait_type: "Face",
    // face/Yummy.png -> Yummy
    value: images[index].face.split("/")[1].split(".")[0],
  });

  metadata.attributes.push({
    trait_type: "Top",
    value: images[index].top.split("/")[1].split(".")[0],
  });

  metadata.attributes.push({
    trait_type: "Bottom",
    value: images[index].bottom.split("/")[1].split(".")[0],
  });

  const outputDir = path.join(__dirname, "../output/metadata");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${index + 1}`);

  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

  console.log(`Saved: ${outputPath}`);
}

async function main() {
  //   await generateImage();

  const loaded = await loadImagesFromJSON();

  //   for (let i = 0; i < loaded.length; i++) {
  //     await saveImageToPNG(loaded[i], i);
  //     await sleep(1);
  //   }

  for (let i = 0; i < loaded.length; i++) {
    await generateMetadataFile(loaded, i);
    await sleep(5);
  }
}

main().catch(console.error);
