declare const tf: any;
declare const poseDetection: any;

let detectorPromise: Promise<any> | null = null;

/**
 * Возвращает MoveNet-детектор, создавая его один раз. Промис кэшируется, поэтому
 * параллельные и повторные вызовы переиспользуют одну модель (и одну загрузку).
 */
export function ensureDetector(): Promise<any> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await tf.setBackend('webgl');
      await tf.ready();
      return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      });
    })().catch(err => {
      detectorPromise = null; // разрешить повтор после ошибки
      throw err;
    });
  }
  return detectorPromise;
}
