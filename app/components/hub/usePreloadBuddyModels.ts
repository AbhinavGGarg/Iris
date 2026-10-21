"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";

export function usePreloadBuddyModels() {
  useEffect(() => {
    useGLTF.preload("/models/Fox.glb");
    useGLTF.preload("/models/RobotExpressive.glb");
  }, []);
}
