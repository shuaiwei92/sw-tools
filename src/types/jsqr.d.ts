// jsqr 无官方类型声明，这里补充最小可用声明。
declare module 'jsqr' {
  export interface Point {
    x: number;
    y: number;
  }
  export interface QRCodeResult {
    data: string;
    /** 二维码四个角的定位点（检测成功时提供） */
    location?: {
      topLeftCorner: Point;
      topRightCorner: Point;
      bottomLeftCorner: Point;
      bottomRightCorner: Point;
    };
  }
  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' }
  ): QRCodeResult | null;
}
