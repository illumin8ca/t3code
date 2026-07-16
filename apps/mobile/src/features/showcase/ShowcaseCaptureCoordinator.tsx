import { useEffect, useRef, useState } from "react";
import { Keyboard, View } from "react-native";
import { StackActions, useNavigation } from "@react-navigation/native";

import { useConnectionController } from "../connection/useConnectionController";
import { useProjects, useThreadShells } from "../../state/entities";
import { useWorkspaceState } from "../../state/workspace";
import {
  getNativeShowcasePairingUrl,
  getNativeShowcaseScene,
  markNativeShowcaseReady,
  type ShowcaseScene,
} from "./nativeShowcaseScene";

const SHOWCASE_ENABLED = process.env.EXPO_PUBLIC_SHOWCASE === "1";
const SHOWCASE_THREAD_ID = "polish-command-palette";

function sceneFromPathname(pathname: string): ShowcaseScene | null {
  const routePath = pathname.split(/[?#]/u, 1)[0] ?? pathname;
  if (routePath.endsWith("/terminal")) return "terminal";
  if (routePath.endsWith("/review")) return "review";
  if (routePath.startsWith("/threads/")) return "thread";
  if (routePath === "/") return "threads";
  return null;
}

export function ShowcaseCaptureCoordinator(props: { readonly pathname: string }) {
  const navigation = useNavigation();
  const { connectPairingUrl } = useConnectionController();
  const { state: workspaceState } = useWorkspaceState();
  const projects = useProjects();
  const threads = useThreadShells();
  const attemptedPairingRef = useRef<string | null>(null);
  const [pairingUrl, setPairingUrl] = useState<string | null>(null);
  const [requestedScene, setRequestedScene] = useState<ShowcaseScene | null>(null);
  const [readyScene, setReadyScene] = useState<ShowcaseScene | null>(null);

  useEffect(() => {
    if (!SHOWCASE_ENABLED || pairingUrl !== null) return;

    const readPairingUrl = () => {
      const value = getNativeShowcasePairingUrl();
      if (value) setPairingUrl(value);
    };
    readPairingUrl();
    const interval = setInterval(readPairingUrl, 250);
    return () => clearInterval(interval);
  }, [pairingUrl]);

  useEffect(() => {
    if (!SHOWCASE_ENABLED) return;

    const readRequestedScene = () => {
      const value = getNativeShowcaseScene();
      if (value) setRequestedScene(value);
    };
    readRequestedScene();
    const interval = setInterval(readRequestedScene, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!SHOWCASE_ENABLED || pairingUrl === null) return;
    if (attemptedPairingRef.current === pairingUrl) return;
    attemptedPairingRef.current = pairingUrl;
    void connectPairingUrl(pairingUrl);
  }, [connectPairingUrl, pairingUrl]);

  const scene = sceneFromPathname(props.pathname);
  const hasFixture =
    workspaceState.hasReadyEnvironment &&
    projects.length > 0 &&
    threads.some((thread) => String(thread.id) === SHOWCASE_THREAD_ID);
  const showcaseThread = threads.find((thread) => String(thread.id) === SHOWCASE_THREAD_ID);

  useEffect(() => {
    if (!SHOWCASE_ENABLED || requestedScene === null || !hasFixture || !showcaseThread) return;
    if (scene === requestedScene) return;

    const params = {
      environmentId: String(showcaseThread.environmentId),
      threadId: SHOWCASE_THREAD_ID,
    };
    if (requestedScene === "threads") {
      navigation.dispatch(StackActions.replace("Home"));
    } else if (requestedScene === "thread") {
      navigation.dispatch(StackActions.replace("Thread", params));
    } else if (requestedScene === "terminal") {
      navigation.dispatch(
        StackActions.replace("ThreadTerminal", { ...params, terminalId: "term-1" }),
      );
    } else {
      navigation.dispatch(StackActions.replace("ThreadReview", params));
    }
  }, [hasFixture, navigation, requestedScene, scene, showcaseThread]);

  useEffect(() => {
    if (
      !SHOWCASE_ENABLED ||
      scene === null ||
      requestedScene === null ||
      scene !== requestedScene ||
      !hasFixture
    ) {
      setReadyScene(null);
      return;
    }
    // Review owns its readiness marker because route activation happens before
    // the VCS request is parsed and the native diff surface is mounted.
    if (scene === "review") {
      setReadyScene(null);
      return;
    }
    if (scene === "terminal") Keyboard.dismiss();

    let readyFrame: number | null = null;
    const settleTimer = setTimeout(() => {
      const renderFrame = requestAnimationFrame(() => {
        readyFrame = requestAnimationFrame(() => {
          markNativeShowcaseReady(scene);
          setReadyScene(scene);
        });
      });
      readyFrame = renderFrame;
    }, 500);
    return () => {
      clearTimeout(settleTimer);
      if (readyFrame !== null) cancelAnimationFrame(readyFrame);
    };
  }, [hasFixture, requestedScene, scene]);

  if (!SHOWCASE_ENABLED || readyScene === null) return null;

  return (
    <View
      pointerEvents="none"
      testID={`showcase-ready-${readyScene}`}
      style={{ position: "absolute", width: 1, height: 1, opacity: 0.01 }}
    />
  );
}
