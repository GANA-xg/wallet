import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIEWPORT_HEIGHT = 220;

interface CardScannerProps {
  onCapture: (imagePath: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export default function CardScanner({ onCapture, onCancel, disabled }: CardScannerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<any>(null);
  const [flashMode, setFlashMode] = useState<"off" | "on">("off");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [permissionState, setPermissionState] = useState<"unknown" | "granted" | "denied" | "unavailable">("unknown");
  const [hasDevice, setHasDevice] = useState(true);

  useEffect(() => {
    initCamera();
  }, []);

  const initCamera = async () => {
    try {
      const VisionCamera = require("react-native-vision-camera");
      const { Camera, useCameraDevice, useCameraPermission } = VisionCamera;

      const perm = await VisionCamera.requestCameraPermission();
      if (perm === "denied" || perm === "denied-always") {
        setPermissionState("denied");
        return;
      }

      const available = VisionCamera.getCameraDeviceTypes();
      if (!available || available.length === 0 || !available.includes("back")) {
        setHasDevice(false);
        return;
      }

      setPermissionState("granted");
    } catch {
      setPermissionState("unavailable");
    }
  };

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing || disabled) return;

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: flashMode,
      });
      if (photo?.path) {
        onCapture(photo.path);
      }
    } catch {
      setCapturing(false);
    }
  }, [capturing, disabled, flashMode, onCapture]);

  if (permissionState === "denied") {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.viewport}>
          <View style={[styles.errorIcon, { backgroundColor: colors.surfaceElevated }]}>
            <Feather name="camera-off" size={32} color="rgba(255,255,255,0.4)" />
          </View>
          <Text style={styles.errorTitle}>Camera Access Required</Text>
          <Text style={styles.errorSub}>
            Enable camera access in Settings to scan your card
          </Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (permissionState === "unavailable" || !hasDevice) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.viewport}>
          <View style={[styles.errorIcon, { backgroundColor: colors.surfaceElevated }]}>
            <Feather name="alert-triangle" size={32} color="rgba(255,255,255,0.4)" />
          </View>
          <Text style={styles.errorTitle}>Camera Unavailable</Text>
          <Text style={styles.errorSub}>
            Card scanning requires a development build with vision-camera
          </Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <View style={styles.viewport}>
        <CameraView
          ref={cameraRef}
          flash={flashMode}
          onReady={() => setCameraReady(true)}
        />

        <View style={styles.scanOverlay}>
          <View style={styles.scanCornerTL} />
          <View style={styles.scanCornerTR} />
          <View style={styles.scanCornerBL} />
          <View style={styles.scanCornerBR} />
          <Feather name="credit-card" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.scanPrompt}>Position your card within the frame</Text>
        </View>

        {!cameraReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.flashBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
          onPress={() => setFlashMode((f) => (f === "off" ? "on" : "off"))}
        >
          <Feather
            name={flashMode === "on" ? "zap" : "zap-off"}
            size={18}
            color={flashMode === "on" ? "#FFD700" : "#fff"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureBtn, disabled && styles.captureBtnDisabled]}
          onPress={handleCapture}
          disabled={!cameraReady || capturing || disabled}
        >
          {capturing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CameraView({
  ref,
  flash,
  onReady,
}: {
  ref: React.RefObject<any>;
  flash: "off" | "on";
  onReady: () => void;
}) {
  const [CameraComponent, setCameraComponent] = useState<any>(null);
  const [device, setDevice] = useState<any>(null);

  useEffect(() => {
    try {
      const VC = require("react-native-vision-camera");
      setCameraComponent(() => VC.Camera);

      const backDevices = VC.Camera.getAvailableCameraDevices?.();
      const backDevice = backDevices?.find((d: any) => d.position === "back");
      setDevice(backDevice ?? null);
    } catch {}
  }, []);

  if (!CameraComponent || !device) {
    return <View style={StyleSheet.absoluteFill} />;
  }

  return (
    <CameraComponent
      ref={ref}
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={true}
      photo={true}
      flash={flash}
      onInitialized={onReady}
      enableZoomGesture={true}
    />
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 20, overflow: "hidden", marginBottom: 20 },
  viewport: {
    width: "100%",
    height: VIEWPORT_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  scanCornerTL: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#FFFDF9",
    borderRadius: 4,
  },
  scanCornerTR: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#FFFDF9",
    borderRadius: 4,
  },
  scanCornerBL: {
    position: "absolute",
    bottom: 12,
    left: 12,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#FFFDF9",
    borderRadius: 4,
  },
  scanCornerBR: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#FFFDF9",
    borderRadius: 4,
  },
  scanPrompt: { color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  flashBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  captureBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fff",
  },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  cancelBtnText: { color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: "600" },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  errorTitle: { color: "#FFFDF9", fontSize: 15, fontWeight: "700", marginTop: 8 },
  errorSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", marginTop: 4, paddingHorizontal: 40 },
});
