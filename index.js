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
  console.log('INITIAL GAME DATA: ', gameData);

  response.status(200).send('ok')
}

function handleMove(request, response) {
  var gameData = request.body

  gameData.allBodyCoords = [];
  gameData.allSnekBodies = [];
  gameData.allSnekHeads = [];

  findAllSneks(gameData);

  const thisMove = move(gameData);

  console.log('MOVE: ' + thisMove)
  console.log('GAME DATA: ',gameData);

  response.status(200).send({
    move: thisMove
  })
}

function findAllSneks(gameData) {
  const sneks = gameData.board.snakes
  
  sneks.forEach((snek) => {
    gameData.allBodyCoords.push(...snek.body, snek.head);
    gameData.allSnekBodies.push(...snek.body);
    gameData.allSnekHeads.push(snek.head);
  });
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
    console.log('MOVES LEFT AFTER THIS ONE', movesArr)
    
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

  if (eatSmallerSnek({ coords: newHeadPos, gameData })) return true; // If we're about to hit a smaller snake's head, go for it!

  if (hitSnekBodyOrWall({ coords: newHeadPos, gameData })) return false // Do not run into self or wall!
  if (trapSelf({ newHeadPos, moveDir, gameData })) return false // Do not end up trapping self!
  if (movingTowardsSnek({ coords: newHeadPos, gameData })) return false // Avoid going towards snakes! Including yourself!

  // No collisions or danger moves! We can move this direction!
  return true
}

function coordsInSet({ coords, set }) {
  if(set.some(setCoords => setCoords.x === coords.x && setCoords.y === coords.y)){
    return true
  }

  return false
}

function eatSmallerSnek({ coords, gameData }) {
  if (!snekHeadInCoord({ coords, gameData })) return false;

  const myLength = gameData.you.body.length;
  const enemy = gameData.board.snakes.filter((snek) => snek.head === coords || snek.body.includes(coords));

  return myLength > enemy.length;
}

function hitLargerSnekHead({ coords, gameData }) {
  !eatSmallerSnek({ coords, gameData });
}

function bodyOrWallInCoord({ coords, gameData }) {
  if (hitLargerSnekHead({ coords, gameData })) return true;
  if (snekBodyInCoord({ coords, gameData })) return true;

  if(hitWall({ coords, gameData })) {
    return true
  }

  return false
}

function snekBodyInCoord({ coords, gameData }) {
  console.log('bodyCoords: ', gameData.allSnekBodies)

  if(coordsInSet({ coords, set: gameData.allSnekBodies })){
    return true
  }
}

function snekHeadInCoord({ coords, gameData }) {
  console.log('headCoords: ', gameData.allSnekHeads)

  if(coordsInSet({ coords, set: gameData.allSnekHeads })){
    return true
  }
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

// function range(size, startAt = 0) {
//   return [...Array(size).keys()].map(i => i + startAt);
// }

// function buildLineOfSightCoords({ headPos, gameData }) {
//   const coords = {}

//   possibleMoves.forEach(dir => {
//     const coordsDir = []

//     const axis = ['up', 'down'].includes(dir) ? 'y' : 'x'
//     const boardDim = ['up', 'down'].includes(dir) ? 'height' : 'width'
//     const incrementer = ['up', 'right'].includes(dir) ? 'pos' : 'neg'

//     if (incrementer === 'pos') {
//       range(gameData.board[boardDim], headPos[axis]).forEach(num => {
//         const coords = { x: headPos.x, y: headPos.y }

//         coords[axis] = num

//         coordsDir.push(coords)
//       })
//     }

//     coords[dir] = coordsDir
//   })

//   return coords
// }

// function bodyInLinearSightByDirection({ dir, gameData }) {
//   const { lineOfSightCoords } = gameData
      
//   lineOfSightCoords[dir].forEach(coords => {
//     if (coordsInSet({ coords, set: gameData.you.body })) return true
//   })

//   return false
// }

// function headingTowardsSelfTrap({ moveDir, newHeadPos, gameData }) {
//   const allWaysClear = true
//   let bodyPartInLineOfSight = 0

//   gameData.lineOfSightCoords = buildLineOfSightCoords({ headPos: newHeadPos, gameData })

//   console.log("LINE OF SIGHT?", gameData.lineOfSightCoords)

//   possibleMoves.forEach(dir => {
//     if (bodyInLinearSightByDirection({ dir: moveDir, gameData })) {
//       allWaysClear = false
//     } else {
//       bodyPartInLineOfSight++
//     }
//   })

//   if (allWaysClear) return false
//   if (bodyPartInLineOfSight < 3) return false

//   return true
// }

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

  if (hitWall({ coords: { x: coords.x, y: coords.y - 1 }, gameData })) { // check down
    return 'down'
  } 

  if (hitWall({ coords: { x: coords.x - 1, y: coords.y }, gameData })) { // check left
    return 'left'
  } 

  if (hitWall({ coords: { x: coords.x + 1, y: coords.y }, gameData })) { // check right
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

  // about to head towards a "wall trap"
  if (headingTowardsWallTrap({ moveDir, gameData })) {
    console.log('** GONNA TRAP YERSELF, HUN! **\n')
    return true
  }

  // // about to head toward a trap within itself
  // if (headingTowardsSelfTrap({ moveDir, newHeadPos, gameData })) {
  //   console.log('** GONNA TRAP YERSELF, HUN! **\n')
  //   return true
  // }

  return false
}

function movingTowardsSnek({ coords, gameData }) {
  const currentCoords = gameData.you.head;

  gameData.allBodyCoords.forEach((snekPart) => {
    if (movingTowardsCoords({ currentCoords, moveCoords: coords, checkCoords: snekPart })) return true;
  });

  return false;
}

function movingTowardsCoords({ currentCoords, moveCoords, checkCoords }) {
  const commonCoord = xOrYInCommon({ coordsA: moveCoords, coordsB: checkCoords });
  if (!commonCoord) return false;

  const CNIC = commonCoord[1];
  const ogDistance = checkCoords[CNIC] - currentCoords[CNIC];
  const newDistance = checkCoords[CNIC] - moveCoords[CNIC];

  if (newDistance > ogDistance) return false;

  return {
    distance: newDistance,
  };
}

function xOrYInCommon({ coordsA, coordsB }) {
  if (coordsA.x === coordsB.x) return ['x', 'y'];
  if (coordsA.y === coordsB.y) return ['y', 'x'];

  return false;
}

function hitSnekBodyOrWall({ coords, gameData }) {
  if (bodyOrWallInCoord({ coords, gameData })) {
    console.log('** GONNA HIT YERSELF (OR ANOTHER SNEK), HUN! **\n')
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
