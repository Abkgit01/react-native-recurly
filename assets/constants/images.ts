import avatar from "@/assets/assets/images/avatar.png";
import splashPattern from "@/assets/assets/images/splash-pattern.png";

export const images = { splashPattern, avatar } as const;

export type ImageKey = keyof typeof images;
