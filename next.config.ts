import type { NextConfig } from "next";

const config: NextConfig = { output: "standalone", distDir: process.env.NEXT_OUTPUT_DIR || ".next" };
export default config;
