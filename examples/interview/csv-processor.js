//import file system from node.js
var fs = require('fs');

processFile('rotations.csv', 'spots.csv');

//main function
function processFile (rotations, spots) {
  //reads the rotation file
  fs.readFile(rotations, 'utf8', (err, result) => {
    if (err) console.log(err);
    let rotation = processData(result);
    //reads the spots file
    fs.readFile(spots, 'utf8', (error, data) => {
      if (error) console.log(error);
      let spot = processData(data);
      //sets both the creativeCPV and rotationCPV into an array of objects with identification as well as CPV
      let creativeCPV = CPVCreative(spot);
      let rotationCPV = CPVRotation(rotation, spot);
      console.log('creative CPV', creativeCPV);
      console.log('rotatin CPV', rotationCPV);
    })
  });
};

//helper function in order to transform the data into an object
function processData (data) {
  let results = {}, temp, currentKey, currentEntry;
  //splits each line according to a new line
  let allTextLines = data.split(/\r\n|\n/);
  //splits each entry per line according to commas
  let entries = allTextLines.shift().split(',');
  results.keys = entries;
  for (let i = 0; i < allTextLines.length; i ++) {
    temp = allTextLines[i].split(',');
    for (let y = 0; y < temp.length; y ++) {
      //replaces each element by taking away the ""
      currentEntry = temp[y].replace(/['"]+/g, '');
      currentKey = results.keys[y].replace(/['"]+/g, '');
      // if the key exists, it should be an array, so we should push the element onto the array
      if (results[currentKey]) results[currentKey].push(currentEntry);
      //if it doesnt exsit, make an array with the element inside it
      else results[currentKey] = [currentEntry];
    }
  }
  return results;
};

//helper function in order to make our creative CPV object
function CPVCreative (spot) {
  let result = {}, creatives = spot.Creative, creative, results = [], curr;
  for (let i = 0; i < creatives.length; i ++) {
    creative = creatives[i];
    //if the key/value doesn't exist, make the value a new object with spend and views being 0
    if (!result[creative]) {
      result[creative] = {
        spend: 0,
        views: 0
      }
    }
    //add the current element spend to the total views of the creative it correlates with
    result[creative].spend += parseInt(spot.Spend[i]);
    //add the current element views to the total views of the creative it correlates with
    result[creative].views += parseInt(spot.Views[i]);
  }
  //makes a new object with keys: creative and CPV then pushes it on to the results
  for (let key in result) {
    curr = result[key]
    creative = {};
    creative.creative = key;
    creative.CPV = curr.spend / curr.views;
    results.push(creative);
  }
  return results;
}

//helper function to make our rotationCPV object
function CPVRotation (rotation, spot) {
  //changes each date to a number in the START and END of the rotation object
  rotation.Start = rotation.Start.map( element => timeToNumber(element));
  rotation.End = rotation.End.map( element => timeToNumber(element));
  let result = {}, date, time, results = [], curr, rotationObject;
  let {Start, End} = rotation, {Spend, Views} = spot;
  for (let i = 0; i < spot.Time.length; i ++) {
    date = spot.Date[i];
    time = timeToNumber(spot.Time[i]);
    if (!result[date]) {
      result[date] = {}
    }
    for (let y = 0; y < Start.length; y ++) {
      if (Start[y] <= time && time <= End[y]) {
        //if the certain date and rotation does not exist in the result, we make a new with spend and views = 0
        if (!result[date][rotation.Name[y]]) {
          result[date][rotation.Name[y]] = {
            spend: 0,
            views: 0
          }
        }
        curr = result[date][rotation.Name[y]]
        //add the current element views to the total views of the date/ rotation it correlates with
        curr.spend += parseInt(Spend[i]);
        curr.views += parseInt(Views[i]);
      }
    }
  }
  for (let dates in result) {
    for (let rotations in result[dates]) {
      curr = result[dates][rotations];
      rotationObject = {};
      rotationObject.date = dates;
      rotationObject.rotation = rotations;
      rotationObject.CPV = curr.spend / curr.views;
      results.push(rotationObject);
    }
  }
  return results;
}

//helper function transform times: (3:00 pm) to a number
function timeToNumber (date) {
  //creates an array that matches the format: (x:x AM)
  var parts = date.match(/(\d+):(\d+) (AM|PM)/);
  if (parts) {
      var hours = parseInt(parts[1]),
          minutes = parseInt(parts[2]),
          AM = parts[3];
      //if AM is equal to PM, and the hours is not 12, we add 12 to our total hours
      if (AM === 'PM' && hours < 12) hours += 12;
      //returns it in a non-integer number format
      return hours + minutes / 100;
  }
  return date;
}
