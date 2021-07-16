const bodyParser = require('body-parser')
const express = require('express')

const PORT = process.env.PORT || 3000

const app = express()
app.use(bodyParser.json())

app.get('/', handleIndex)
app.post('/start', handleStart)
app.post('/move', handleMove)
app.post('/end', handleEnd)

app.listen(PORT, () => console.log(`Battlesnake Server listening at http://127.0.0.1:${PORT}`))

const possibleMoves = ['up', 'down', 'left', 'right']

function handleIndex(request, response) {
  var battlesnakeInfo = {
    apiversion: '1',
    author: '',
    color: '#99994d',
    head: 'beluga',
    tail: 'bolt'
  }
  response.status(200).json(battlesnakeInfo)
}

function handleStart(request, response) {
  var gameData = request.body

  console.log('START')
  response.status(200).send('ok')
}

function handleMove(request, response) {
  var gameData = request.body

  const thisMove = move(gameData)
  
  console.log('MOVE: ' + thisMove)
  console.log('GAME DATA: ',gameData);

  response.status(200).send({
    move: thisMove
  })
}

function handleEnd(request, response) {
  var gameData = request.body

  console.log('END')
  response.status(200).send('ok')
}

function move(gameData) {
  const movesArr = [...possibleMoves]

  console.log('movesArr:', movesArr)
  console.log('body position: ', gameData.you.body)

  // loop through possible moves to see if we can
  // find a safe move to make
  while(movesArr.length) {
    // Pull a random move off the list of possible moves
    // (returns array or removed items)
    const moveDir = movesArr.splice(movesArr.indexOf(randomMove(movesArr)), 1)[0]

    console.log('\n\n** OK, lets try a move! **')
    console.log('MOVE WE ARE ABOUT TO TRY', moveDir)
    console.log('MOVE LEFT AFTER THIS ONE', movesArr)
    
    if (tryMove({ moveDir, gameData })) {
      movesArr.length = 0 // empty out temp moves list so we don't keep looping
      return moveDir // send the safe move back to the app to move our snek
    }
  }
}

function randomMove(movesArr = possibleMoves) {
  return movesArr[Math.floor(Math.random() * movesArr.length)]
}

function tryMove({ moveDir, gameData }) {
  const newHeadPos = updatedHeadCoords({ curHeadCoords: gameData.you.head, moveDir })

  if (hitSelfOrWall({ coords: newHeadPos, gameData })) return false // Do not run into self or wall!
  if (trapSelf({ newHeadPos, moveDir, gameData })) return false // Do not end up trapping self!

  // No collisions! We can move this direction!
  return true
}

function bodyOrWallInCoord({ coords, gameData }) {
  const bodyCoords = gameData.you.body

  console.log('bodyCoords: ', bodyCoords)

  if(bodyCoords.some(bodyCoord => bodyCoord.x === coords.x && bodyCoord.y === coords.y)){
    return true
  }

  if(hitWall({ coords, gameData })) {
    return true
  }

  return false
}

function surroundedBySelfOrWall({ newHeadPos, gameData }) {
  if (
    bodyOrWallInCoord({ coords: { x: newHeadPos.x, y: newHeadPos.y + 1 }, gameData }) && // check up
    bodyOrWallInCoord({ coords: { x: newHeadPos.x, y: newHeadPos.y - 1 }, gameData }) && // check down
    bodyOrWallInCoord({ coords: { x: newHeadPos.x - 1, y: newHeadPos.y }, gameData }) && // check left
    bodyOrWallInCoord({ coords: { x: newHeadPos.x + 1, y: newHeadPos.y }, gameData }) // check right
  ) {
    return true
  }

  return false
}

function headingTowardsWallTrap({ moveDir, gameData }) {
  const headToWall = headNextToWall(gameData)
  const bodyToWall = bodyNextToWall(gameData)

  if (!headToWall) return false
  if (!bodyToWall) return false
  if (headToWall !== bodyToWall) return false

  if (moveDir === bodyToWall) return true

  return false
}

function headNextToWall(gameData) {
  return bodyCoordNextToWall({ coords: gameData.you.head, gameData })
}

function bodyNextToWall(gameData) {
  gameData.you.body.forEach((bodyCoords) => {
    return bodyCoordNextToWall({ coords: bodyCoords, gameData })
  })
}

function bodyCoordNextToWall({ coords, gameData }) {
  if (hitWall({ coords: { x: coords.x, y: coords.y + 1 }, gameData })) { // check up
    return 'up'
  } 

  if (hitWall({ coords: { x: coords.x, y: coords.y - 1 }, gameData })) { // check up
    return 'down'
  } 

  if (hitWall({ coords: { x: coords.x - 1, y: coords.y }, gameData })) { // check up
    return 'left'
  } 

  if (hitWall({ coords: { x: coords.x + 1, y: coords.y }, gameData })) { // check up
    return 'right'
  } 

  return false
}

function trapSelf({ newHeadPos, moveDir, gameData }) {
  // about to directly trap self in next move
  if (surroundedBySelfOrWall({ newHeadPos, gameData })) {
    console.log('** GONNA TRAP YERSELF, HUN! **\n')
    return true
  }

  // against about to head towards another wall that the body is against
  if (headingTowardsWallTrap({ moveDir, gameData })) {
    console.log('** GONNA TRAP YERSELF, HUN! **\n')
    return true
  }

  return false
}

function hitSelfOrWall({ coords, gameData }) {
  if (bodyOrWallInCoord({ coords, gameData })) {
    console.log('** GONNA HIT YERSELF, HUN! **\n')
    return true
  }

  return false
}

function hitWall({ coords, gameData }) {
  if(coords.x < 0 || coords.y < 0) {
    console.log('** GONNA HIT A WALL, HUN! **\n')
    return true
  }

  if(coords.x === gameData.board.width || coords.y === gameData.board.height) {
    console.log('** GONNA HIT A WALL, HUN! **\n')
    return true
  }

  return false
}

function updatedHeadCoords({ curHeadCoords, moveDir }) {
  console.log('curHeadCoords: ', curHeadCoords)
  let newHeadCoords

  switch (moveDir) {
    case 'up':
      newHeadCoords = {
        x: curHeadCoords.x,
        y: curHeadCoords.y + 1,
      }
      break;
    case 'down':
      newHeadCoords = {
        x: curHeadCoords.x,
        y: curHeadCoords.y - 1,
      }
      break;
    case 'left':
      newHeadCoords = {
        x: curHeadCoords.x - 1,
        y: curHeadCoords.y,
      }
      break;
    case 'right':
      newHeadCoords = {
        x: curHeadCoords.x + 1,
        y: curHeadCoords.y,
      }
      break;
    default:
      curHeadCoords
  }

  console.log('test head coords', newHeadCoords)

  return newHeadCoords
}
