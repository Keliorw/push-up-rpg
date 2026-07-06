import {DEFAULT_CONFIG} from '../../app/src/pose/config';
import {RepDetector} from '../../app/src/pose/RepDetector';
import {KP, Pose} from '../../app/src/pose/types';

const KEYPOINT_COUNT = 17;
const MIN_SCORE = 0.3;
const EDGES: Array<[number, number]> = [
  [KP.leftShoulder, KP.rightShoulder],
  [KP.leftShoulder, KP.leftElbow],
  [KP.leftElbow, KP.leftWrist],
  [KP.rightShoulder, KP.rightElbow],
  [KP.rightElbow, KP.rightWrist],
  [KP.nose, KP.leftShoulder],
  [KP.nose, KP.rightShoulder],
  [KP.leftShoulder, KP.leftHip],
  [KP.rightShoulder, KP.rightHip],
  [KP.leftHip, KP.rightHip],
  [KP.leftHip, KP.leftKnee],
  [KP.leftKnee, KP.leftAnkle],
  [KP.rightHip, KP.rightKnee],
  [KP.rightKnee, KP.rightAnkle],
];

export interface BattleCamera {
  /** Останавливает камеру и цикл распознавания. Идемпотентно. */
  stop(): void;
  /** Пока paused=true, засчитанные повторы игнорируются (для отдыха), скелет рисуется. */
  setPaused(paused: boolean): void;
}

/**
 * Запускает фронтальную камеру + распознавание поз MoveNet. На каждый
 * засчитанный повтор (когда не на паузе) зовёт onRep(); рисует скелет на canvas.
 * onStatus сообщает текстовые статусы (камера / упор лёжа / ошибка).
 */
export async function startBattleCamera(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  detector: any,
  onRep: () => void,
  onStatus: (text: string) => void,
): Promise<BattleCamera> {
  const ctx = canvas.getContext('2d')!;
  const repDetector = new RepDetector(DEFAULT_CONFIG);
  let paused = false;
  let stopped = false;

  onStatus('Запрашиваю камеру…');
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {facingMode: 'user', width: 640, height: 480},
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  onStatus('Займи упор лёжа');

  function draw(pose: Pose | null) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!pose) return;
    ctx.lineWidth = Math.max(2, canvas.width * 0.008);
    ctx.strokeStyle = '#FFFFFF';
    for (const [a, b] of EDGES) {
      if (!pose[a] || !pose[b]) continue;
      if (pose[a].score < MIN_SCORE || pose[b].score < MIN_SCORE) continue;
      ctx.beginPath();
      ctx.moveTo(pose[a].x, pose[a].y);
      ctx.lineTo(pose[b].x, pose[b].y);
      ctx.stroke();
    }
    ctx.fillStyle = '#F5A623';
    const r = Math.max(3, canvas.width * 0.012);
    for (let i = 0; i < KEYPOINT_COUNT; i++) {
      if (!pose[i] || pose[i].score < MIN_SCORE) continue;
      ctx.beginPath();
      ctx.arc(pose[i].x, pose[i].y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  async function loop() {
    if (stopped) {
      stream.getTracks().forEach(t => t.stop());
      return;
    }
    const poses = await detector.estimatePoses(video, {flipHorizontal: false});
    let pose: Pose | null = null;
    if (poses && poses[0]) {
      const kps = poses[0].keypoints;
      pose = [];
      for (let i = 0; i < KEYPOINT_COUNT; i++) {
        pose.push({x: kps[i].x, y: kps[i].y, score: kps[i].score ?? 0});
      }
      if (!paused) {
        const events = repDetector.process(pose, performance.now());
        for (const e of events) {
          if (e === 'repCounted') onRep();
        }
      }
    }
    draw(pose);
    requestAnimationFrame(loop);
  }
  loop();

  return {
    stop() {
      stopped = true;
      stream.getTracks().forEach(t => t.stop());
    },
    setPaused(p: boolean) {
      paused = p;
    },
  };
}
