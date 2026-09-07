import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';

interface Star {
  x: number;
  y: number;
  z: number;
}

/**
 * Fond étoilé animé, portage du StarsScript.js d'origine.
 * Canvas plein écran, étoiles réactives au mouvement du pointeur.
 */
@Component({
  selector: 'app-stars-background',
  standalone: true,
  templateUrl: './stars-background.component.html',
  styleUrl: './stars-background.component.scss',
})
export class StarsBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') private readonly _Canvas!: ElementRef<HTMLCanvasElement>;

  /** Couleur des étoiles. */
  private static readonly _STAR_COLOR = '#fff';
  /** Taille de base des étoiles. */
  private static readonly _STAR_SIZE = 5;
  /** Échelle minimale de profondeur. */
  private static readonly _STAR_MIN_SCALE = 0.5;
  /** Marge avant recyclage d'une étoile sortie de l'écran. */
  private static readonly _OVERFLOW_THRESHOLD = 100;

  private _Context: CanvasRenderingContext2D | null = null;
  private _Scale = 1;
  private _Width = 0;
  private _Height = 0;
  private _Stars: Star[] = [];
  private _PointerX?: number;
  private _PointerY?: number;
  private _Velocity = { x: 0, y: 0, tx: 0, ty: 0, z: 0.0005 };
  private _TouchInput = false;
  private _RafId = 0;

  constructor(private readonly _Zone: NgZone) {}

  ngAfterViewInit(): void {
    const lCanvas = this._Canvas.nativeElement;
    this._Context = lCanvas.getContext('2d');

    this._Generate();
    this._Resize();

    this._Zone.runOutsideAngular(() => {
      this._Step();
    });

    window.addEventListener('resize', this._OnResize);
    lCanvas.addEventListener('mousemove', this._OnMouseMove);
    lCanvas.addEventListener('touchmove', this._OnTouchMove);
    lCanvas.addEventListener('touchend', this._OnMouseLeave);
    document.addEventListener('mouseleave', this._OnMouseLeave);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this._RafId);
    window.removeEventListener('resize', this._OnResize);
    const lCanvas = this._Canvas?.nativeElement;
    lCanvas?.removeEventListener('mousemove', this._OnMouseMove);
    lCanvas?.removeEventListener('touchmove', this._OnTouchMove);
    lCanvas?.removeEventListener('touchend', this._OnMouseLeave);
    document.removeEventListener('mouseleave', this._OnMouseLeave);
  }

  private readonly _OnResize = (): void => this._Resize();

  private readonly _OnMouseMove = (pEvent: MouseEvent): void => {
    this._TouchInput = false;
    this._MovePointer(pEvent.clientX, pEvent.clientY);
  };

  private readonly _OnTouchMove = (pEvent: TouchEvent): void => {
    this._TouchInput = true;
    this._MovePointer(pEvent.touches[0].clientX, pEvent.touches[0].clientY);
    pEvent.preventDefault();
  };

  private readonly _OnMouseLeave = (): void => {
    this._PointerX = undefined;
    this._PointerY = undefined;
  };

  private _Generate(): void {
    const lCount = (window.innerWidth + window.innerHeight) / 500;
    for (let lIndex = 0; lIndex < lCount; lIndex++) {
      this._Stars.push({
        x: 0,
        y: 0,
        z: StarsBackgroundComponent._STAR_MIN_SCALE + Math.random() * (1 - StarsBackgroundComponent._STAR_MIN_SCALE),
      });
    }
  }

  private _PlaceStar(pStar: Star): void {
    pStar.x = Math.random() * this._Width;
    pStar.y = Math.random() * this._Height;
  }

  private _RecycleStar(pStar: Star): void {
    let lDirection = 'z';
    const lVx = Math.abs(this._Velocity.x);
    const lVy = Math.abs(this._Velocity.y);

    if (lVx > 1 || lVy > 1) {
      let lAxis: string;
      if (lVx > lVy) {
        lAxis = Math.random() < lVx / (lVx + lVy) ? 'h' : 'v';
      } else {
        lAxis = Math.random() < lVy / (lVx + lVy) ? 'v' : 'h';
      }

      if (lAxis === 'h') {
        lDirection = this._Velocity.x > 0 ? 'l' : 'r';
      } else {
        lDirection = this._Velocity.y > 0 ? 't' : 'b';
      }
    }

    pStar.z = StarsBackgroundComponent._STAR_MIN_SCALE + Math.random() * (1 - StarsBackgroundComponent._STAR_MIN_SCALE);

    if (lDirection === 'z') {
      pStar.z = 0.1;
      pStar.x = Math.random() * this._Width;
      pStar.y = Math.random() * this._Height;
    } else if (lDirection === 'l') {
      pStar.x = -StarsBackgroundComponent._OVERFLOW_THRESHOLD;
      pStar.y = this._Height * Math.random();
    } else if (lDirection === 'r') {
      pStar.x = this._Width + StarsBackgroundComponent._OVERFLOW_THRESHOLD;
      pStar.y = this._Height * Math.random();
    } else if (lDirection === 't') {
      pStar.x = this._Width * Math.random();
      pStar.y = -StarsBackgroundComponent._OVERFLOW_THRESHOLD;
    } else if (lDirection === 'b') {
      pStar.x = this._Width * Math.random();
      pStar.y = this._Height + StarsBackgroundComponent._OVERFLOW_THRESHOLD;
    }
  }

  private _Resize(): void {
    this._Scale = window.devicePixelRatio || 1;
    this._Width = window.innerWidth * this._Scale;
    this._Height = window.innerHeight * this._Scale;

    const lCanvas = this._Canvas.nativeElement;
    lCanvas.width = this._Width;
    lCanvas.height = this._Height;

    this._Stars.forEach((lStar) => this._PlaceStar(lStar));
  }

  private _Step = (): void => {
    this._Context?.clearRect(0, 0, this._Width, this._Height);
    this._Update();
    this._Render();
    this._RafId = requestAnimationFrame(this._Step);
  };

  private _Update(): void {
    this._Velocity.tx *= 0.96;
    this._Velocity.ty *= 0.96;

    this._Velocity.x += (this._Velocity.tx - this._Velocity.x) * 0.8;
    this._Velocity.y += (this._Velocity.ty - this._Velocity.y) * 0.8;

    this._Stars.forEach((lStar) => {
      lStar.x += this._Velocity.x * lStar.z;
      lStar.y += this._Velocity.y * lStar.z;

      lStar.x += (lStar.x - this._Width / 2) * this._Velocity.z * lStar.z;
      lStar.y += (lStar.y - this._Height / 2) * this._Velocity.z * lStar.z;
      lStar.z += this._Velocity.z;

      if (
        lStar.x < -StarsBackgroundComponent._OVERFLOW_THRESHOLD ||
        lStar.x > this._Width + StarsBackgroundComponent._OVERFLOW_THRESHOLD ||
        lStar.y < -StarsBackgroundComponent._OVERFLOW_THRESHOLD ||
        lStar.y > this._Height + StarsBackgroundComponent._OVERFLOW_THRESHOLD
      ) {
        this._RecycleStar(lStar);
      }
    });
  }

  private _Render(): void {
    if (!this._Context) {
      return;
    }

    this._Stars.forEach((lStar) => {
      this._Context!.beginPath();
      this._Context!.lineCap = 'round';
      this._Context!.lineWidth = StarsBackgroundComponent._STAR_SIZE * lStar.z * this._Scale;
      this._Context!.globalAlpha = 0.5 + 0.5 * Math.random();
      this._Context!.strokeStyle = StarsBackgroundComponent._STAR_COLOR;

      this._Context!.beginPath();
      this._Context!.moveTo(lStar.x, lStar.y);

      let lTailX = this._Velocity.x * 2;
      let lTailY = this._Velocity.y * 2;

      if (Math.abs(lTailX) < 0.1) {
        lTailX = 0.5;
      }
      if (Math.abs(lTailY) < 0.1) {
        lTailY = 0.5;
      }

      this._Context!.lineTo(lStar.x + lTailX, lStar.y + lTailY);
      this._Context!.stroke();
    });
  }

  private _MovePointer(pX: number, pY: number): void {
    if (typeof this._PointerX === 'number' && typeof this._PointerY === 'number') {
      const lOx = pX - this._PointerX;
      const lOy = pY - this._PointerY;

      this._Velocity.tx += (lOx / 8 * this._Scale) * (this._TouchInput ? 1 : -1);
      this._Velocity.ty += (lOy / 8 * this._Scale) * (this._TouchInput ? 1 : -1);
    }

    this._PointerX = pX;
    this._PointerY = pY;
  }
}