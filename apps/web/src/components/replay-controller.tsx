import { Button } from "@workspace/ui/components/button"

import { Pause, Play, RotateCcw } from "@/components/icons"
import type { PlaybackSpeed } from "@/hooks/use-fleet"
import type { TraccarPosition } from "@/lib/traccar"
import { formatTimestamp, toKph } from "@/lib/utils"

type ReplayControllerProps = {
  positions: TraccarPosition[]
  playbackIndex: number
  isPlaying: boolean
  playbackSpeed: PlaybackSpeed
  currentPosition: TraccarPosition | null
  tripStartTime?: string
  tripEndTime?: string
  onPlayPause: () => void
  onScrub: (index: number) => void
  onSetSpeed: (speed: PlaybackSpeed) => void
}

const SPEED_OPTIONS: PlaybackSpeed[] = [1, 2, 4, 8]

export function ReplayController({
  positions,
  playbackIndex,
  isPlaying,
  playbackSpeed,
  currentPosition,
  tripStartTime,
  tripEndTime,
  onPlayPause,
  onScrub,
  onSetSpeed,
}: ReplayControllerProps) {
  if (positions.length < 2) return null

  const progress =
    positions.length > 1 ? playbackIndex / (positions.length - 1) : 0
  const progressPct = Math.round(progress * 100)

  const currentTime =
    currentPosition?.fixTime ??
    currentPosition?.deviceTime ??
    currentPosition?.serverTime

  const isAtEnd = playbackIndex >= positions.length - 1
  const isAtStart = playbackIndex === 0

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    onScrub(Number(e.target.value))
  }

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 w-full max-w-2xl -translate-x-1/2 px-4">
      <div className="pointer-events-auto flex flex-col gap-3 rounded-xl border border-border/60 bg-background/95 px-4 py-3 shadow-2xl backdrop-blur-md">
        {/* Timeline row */}
        <div className="flex items-center gap-3">
          {/* Play / Pause / Restart */}
          <Button
            size="icon"
            className="size-9 shrink-0 rounded-full shadow-md"
            onClick={onPlayPause}
            title={isAtEnd ? "Restart" : isPlaying ? "Pause" : "Play"}
          >
            {isAtEnd && !isPlaying ? (
              <RotateCcw className="size-4" />
            ) : isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </Button>

          {/* Scrubber */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
              <span>
                {tripStartTime ? formatTimestamp(tripStartTime) : "Start"}
              </span>
              {currentTime && (
                <span className="font-semibold text-foreground">
                  {formatTimestamp(currentTime)}
                </span>
              )}
              <span>{tripEndTime ? formatTimestamp(tripEndTime) : "End"}</span>
            </div>

            {/* Native range with custom styling via CSS vars */}
            <div className="relative h-2 w-full">
              <div className="absolute inset-0 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-none"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={positions.length - 1}
                value={playbackIndex}
                onChange={handleSliderChange}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {/* Thumb indicator */}
              <div
                className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-md transition-none"
                style={{ left: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Speed selector */}
          <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
            {SPEED_OPTIONS.map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => onSetSpeed(speed)}
                className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                  playbackSpeed === speed
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        {currentPosition && (
          <div className="flex items-center gap-6 border-t border-border/40 pt-2 text-[11px]">
            <div className="flex flex-col">
              <span className="text-[9px] tracking-wide text-muted-foreground uppercase">
                Speed
              </span>
              <span className="font-semibold">
                {toKph(currentPosition.speed)} km/h
              </span>
            </div>
            {currentPosition.altitude !== undefined && (
              <div className="flex flex-col">
                <span className="text-[9px] tracking-wide text-muted-foreground uppercase">
                  Altitude
                </span>
                <span className="font-semibold">
                  {Math.round(currentPosition.altitude)} m
                </span>
              </div>
            )}
            {currentPosition.course !== undefined && (
              <div className="flex flex-col">
                <span className="text-[9px] tracking-wide text-muted-foreground uppercase">
                  Heading
                </span>
                <span className="font-semibold">
                  {Math.round(currentPosition.course)}°
                </span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[9px] tracking-wide text-muted-foreground uppercase">
                Position
              </span>
              <span className="font-mono text-[10px] font-semibold">
                {playbackIndex + 1} / {positions.length}
              </span>
            </div>
            {!isAtStart && (
              <div className="ml-auto flex flex-col items-end">
                <span className="text-[9px] tracking-wide text-muted-foreground uppercase">
                  Progress
                </span>
                <span className="font-semibold">{progressPct}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
