import ballAudio from "@assets/sounds/ball.wav"
import { ActionsGame } from "@pages/Plinko/components/ActionsGame"
import { ActiveBalls } from "@pages/Plinko/components/ActiveBalls"
import {
  getHolesByLine,
  getHoleSound,
} from "@pages/Plinko/components/Game/utils/getHoles"
import { getRateForLine } from "@pages/Plinko/components/Game/utils/getRateForLine"
import { HolesHtml } from "@pages/Plinko/components/HolesHtml"
import { Lines } from "@pages/Plinko/components/Lines"
import { PlayAction } from "@pages/Plinko/components/PlayAction"
import { RiskModesWrapper } from "@pages/Plinko/components/RiskModes"
import { incrementBalance } from "@store/auth/auth.slice"
import { roundNumber } from "@store/auth/auth.utils"
import {
  selectActiveBalls,
  selectLinesCount,
  selectRiskMode,
} from "@store/config/config.selectors"
import {
  addGameRunning,
  removeGameRunning,
  setLastWin,
} from "@store/config/config.slice"
import type { HistoryItem } from "@store/history/history.interface"
import {
  addItemToHistory,
  addItemToStatistic,
} from "@store/history/history.slice"
import { useAppDispatch, useAppSelector } from "@store/hooks/store.hooks"
import { random } from "@utils/random"
import { format } from "date-fns"
import type { IEventCollision } from "matter-js"
import { Bodies, Body, Engine, Events, Render, Runner, World } from "matter-js"
import { useCallback, useEffect, useState } from "react"
import { v4 as uuidv4 } from "uuid"

import {
  ACTIVE_AREA_HEIGHT,
  canvasColors,
  DISTANCE_FROM_TOP_FLOOR,
  INITIAL_SIZES_FOR_8_LINES,
  MAX_ACTIVE_BALLS,
  MAX_WORLD_HEIGHT,
  MAX_WORLD_WIDTH,
  START_PINS,
} from "./config"
import styles from "./index.module.css"

export function Game() {
  const activeBalls = useAppSelector(selectActiveBalls)
  const linesCount = useAppSelector(selectLinesCount)
  const riskMode = useAppSelector(selectRiskMode)
  const dispatch = useAppDispatch()
  const [configSizes, setConfigSizes] = useState(INITIAL_SIZES_FOR_8_LINES)

  const engine = Engine.create()

  useEffect(() => {
    setConfigSizes(getRateForLine(linesCount))
  }, [linesCount, riskMode])

  useEffect(() => {
    engine.gravity.y = 1.0
    const element = document.getElementById("plinko")
    const render = Render.create({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      element: element!,
      bounds: {
        max: {
          y: MAX_WORLD_HEIGHT,
          x: MAX_WORLD_WIDTH,
        },
        min: {
          y: 0,
          x: 0,
        },
      },
      options: {
        width: MAX_WORLD_WIDTH,
        height: MAX_WORLD_HEIGHT,
        background: canvasColors.background,
        hasBounds: true,
        wireframes: false,
        pixelRatio: 3,
      },
      engine,
    })

    const runner = Runner.create()
    Runner.run(runner, engine)
    Render.run(render)

    return () => {
      World.clear(engine.world, true)
      Engine.clear(engine)
      Render.stop(render)
      Runner.stop(runner)
      render.canvas.remove()
      render.textures = {}
    }
  }, [configSizes])

  const pins: Body[] = []

  for (let l = 0; l < linesCount; l++) {
    const linePins = START_PINS + l
    const lineWidth = linePins * configSizes.pinGap

    for (let i = 0; i < linePins; i++) {
      const pinX =
        MAX_WORLD_WIDTH / 2 -
        lineWidth / 2 +
        i * configSizes.pinGap +
        configSizes.pinGap / 2

      const pinY =
        ACTIVE_AREA_HEIGHT / linesCount +
        l * configSizes.pinGap +
        DISTANCE_FROM_TOP_FLOOR

      const pin = Bodies.circle(pinX, pinY, configSizes.pinSize, {
        label: `pin-${i}`,
        render: {
          fillStyle: "white",
        },
        isStatic: true,
      })

      pins.push(pin)
    }
  }

  function addInGameBall() {
    if (activeBalls > MAX_ACTIVE_BALLS) return

    dispatch(addGameRunning())
  }

  function removeBall() {
    dispatch(removeGameRunning())
  }

  function bet(betValue: number) {
    play(betValue)
  }

  const play = useCallback(
    (ballValue: number) => {
      addInGameBall()

      const ballSound = new Audio(ballAudio)
      playSong(ballSound)

      const ballColor =
        ballValue <= 0 ? canvasColors.ballInactive : canvasColors.ballActive
      const ball = Bodies.circle(
        MAX_WORLD_WIDTH / 2 + random(-15, 15),
        DISTANCE_FROM_TOP_FLOOR,
        configSizes.ballSize,
        {
          label: `ball-${ballValue}`,
          id: new Date().getTime(),
          restitution: 0.8,
          friction: 0.3,
          frictionAir: 0.03,
          collisionFilter: {
            group: -1,
          },
          render: {
            fillStyle: ballColor,
          },
          isStatic: false,
        },
      )
      World.add(engine.world, ball)
    },
    [configSizes],
  )

  const initPosition = Bodies.circle(
    MAX_WORLD_WIDTH / 2,
    DISTANCE_FROM_TOP_FLOOR,
    configSizes.ballSize,
    {
      label: `ballHole`,
      id: new Date().getTime(),
      render: {
        fillStyle: "#9ba6a5",
      },
      isSensor: true,
      isStatic: true,
    },
  )

  const leftWall = Bodies.rectangle(
    linesCount < 12
      ? MAX_WORLD_WIDTH / 2 - configSizes.pinSize * 2
      : MAX_WORLD_WIDTH / 2,
    0,
    MAX_WORLD_WIDTH * 2,
    20,
    {
      angle: 90,
      render: {
        visible: false,
      },
      isStatic: true,
    },
  )

  const rightWall = Bodies.rectangle(
    linesCount < 12
      ? MAX_WORLD_WIDTH / 2 + configSizes.pinSize * 2
      : MAX_WORLD_WIDTH / 2,
    0,
    MAX_WORLD_WIDTH * 2,
    20,
    {
      angle: -90,
      render: {
        visible: false,
      },
      isStatic: true,
    },
  )

  const holes = getHolesByLine(linesCount, riskMode)
  const holesBodies: Body[] = []
  let firstHolePositionX: number =
    MAX_WORLD_WIDTH / 2 -
    (configSizes.pinGap / 2) * linesCount -
    configSizes.pinGap

  holes.forEach((hole) => {
    const blockSize = configSizes.pinGap - configSizes.pinSize * 2 // height and width
    const holeBody = Bodies.rectangle(
      firstHolePositionX + blockSize + configSizes.pinSize * 2,
      ACTIVE_AREA_HEIGHT + DISTANCE_FROM_TOP_FLOOR,
      blockSize,
      blockSize,
      {
        label: `hole-${hole.id}`,
        isStatic: true,
        render: {
          fillStyle: hole.color,
        },
      },
    )
    firstHolePositionX = holeBody.position.x
    holesBodies.push(holeBody)
  })

  World.add(engine.world, [
    ...pins,
    ...holesBodies,
    initPosition,
    leftWall,
    rightWall,
  ])

  function playSong(song: HTMLAudioElement) {
    song.currentTime = 0
    song.volume = 0.2
    song.play()
  }

  function onTouchHole(ball: Body, multiplier: Body) {
    ball.collisionFilter.group = 2
    World.remove(engine.world, ball)
    removeBall()

    const ballValue = ball.label.split("-")[1]
    const holeValueFromLabel = +multiplier.label.split("-")[1]

    const holeSong = new Audio(
      getHoleSound(linesCount, riskMode, holeValueFromLabel),
    )
    holeSong.currentTime = 0
    holeSong.volume = 0.2
    holeSong.play()

    if (+ballValue <= 0) return

    const newBalance = +ballValue * holeValueFromLabel
    const lastWin = roundNumber(+ballValue * holeValueFromLabel - +ballValue)

    const historyItem: HistoryItem = {
      id: uuidv4(),
      bet: ballValue,
      payout: holeValueFromLabel,
      time: format(new Date(), "HH:mm:ss"),
      win: lastWin,
    }

    dispatch(addItemToStatistic(holeValueFromLabel))
    dispatch(setLastWin({ lastWin }))
    dispatch(addItemToHistory(historyItem))
    dispatch(incrementBalance(newBalance))
  }

  function onTouchPin(ball: Body, pin: Body) {
    // const pinSong = new Audio(withPin);
    // playSong(pinSong);

    pin.render.fillStyle = "yellow"

    setTimeout(() => {
      pin.render.fillStyle = "white"
    }, 100)
  }

  function onCollisionStart(event: IEventCollision<Engine>) {
    const pairs = event.pairs

    for (const pair of pairs) {
      const { bodyA, bodyB } = pair

      if (bodyB.label.includes("ball") && bodyA.label.includes("pin")) {
        onTouchPin(bodyB, bodyA)
      }

      if (bodyB.label.includes("ball") && bodyA.label.includes("hole")) {
        onTouchHole(bodyB, bodyA)
      }
    }
  }

  Events.on(engine, "collisionStart", onCollisionStart)

  return (
    <div className={styles.mainWrapper}>
      <div className={styles.canvasWrapper}>
        <div id="plinko" />
        <Lines />
        <RiskModesWrapper />
        <ActiveBalls />
        <HolesHtml config={configSizes} />
      </div>
      <PlayAction run={bet} />
      <ActionsGame />
    </div>
  )
}
