This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Development on local machine

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:8000](http://localhost:8000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

## Adding users and sensors

The users and coordinates of the sensors are stored in `backend/configuration.json`

The structure of the file should be like this:

```
{
  "users": {
    "00000001": {
      "name": "Abraham Example"
    },
    "0000002": {
      "name": "Beatrice Otheruser",
      "imageURL": "https://url-to-image.file/avatar.jpg"
    },
  },
  "sensorLocations": {
    "0000003": {
      "x": 9.04225352112676,
      "y": 13.878688524590164
    },
    "0000002": {
      "x": 19.295774647887324,
      "y": 7.357377049180328
    }
  }
}
```


## Adding new data types

The app currently uses the following database tables to display sensor data on the frontend:

1. employee_location
2. airpressure
3. humidity
4. illuminance
5. temperature

The last 4 of those use the same basic data structure and column names. Adding another database table that uses the same structure is as simple as adding the name of the table to the file `src/datatypes.js`.

If the table uses different column names, some customization is required. Take a look at the `getData`-function in `backend/database.js`.

To get the data to show up on the map, you need to create some kind of visualization function for it in the Map-component. Take a look at the `renderHeatMaps` function for an example.

The locations of the sensors tag IDs should also be added to the `configuration.json` file.

## Deployment

1. Make your code changes, commit and push them to git

2. ssh to the VirpaD server from the university network and navigate to `/var/www/locationmap`

3. Get the latest commit from git:

   `sudo git remote update`

   `sudo git reset --hard origin/master`

4. Install dependencies:

   `sudo npm install --production --unsafe-perm=true`

5. Build the front-end single page app:

   `sudo npm run build`

6. Restart the pm2 process:

   `sudo pm2 restart "VirpaD Webapp"`

## How to change the frontend password

1. Run the password hash script with the command `node tools/create-password-hash.js y0ur_n3w_p4ssw0rd`

2. Replace the PASSWORD_HASH line with the one printed by the script in the `.env` file in the project root.

3. Restart the backend: `sudo pm2 restart "VirpaD Webapp"`



