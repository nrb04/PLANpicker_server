const express = require("express");
const app = express();
const cors = require("cors");
const { ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;



// middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(express());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://planPicker:YcfhIhEj7NsAhwYZ@cluster0.4mtnldq.mongodb.net/?retryWrites=true&w=majority";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const addEventCollection = client.db("PlanPickerDb").collection("addEvent");


    app.post("/addEvent", async (req, res) => {
      const addEvent = req.body

      const result = await addEventCollection.insertOne(addEvent);
      res.send(result);
    })


    app.get("/getEvent", async (req, res) => {
      const result = await addEventCollection.find().toArray();
      res.send(result);
    })


    app.get('/getEvent/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await addEventCollection.find(query).toArray();
      res.send(result)

    })


    // Express route to create a Zoom meeting
    app.post("/createMeeting", async (req, res) => {
      // const { topic, duration, start_date, start_time } = req.body;
      const { eventName, formData, location } = req.body;
      const { eventDuration, startDate, startTime } = formData


      if (location === "Zoom") {

        try {
          // Zoom API setup
          const axios = require('axios');

          const client_id = "YjrODn1WT4WA1f83jICVuQ";
          const account_id = "Pyy1V6i_T3uZGOgt9tD6Sg";
          const client_secret = "8j7i0jhep3mnaFIT4NduGWF5fem7xdQh";

          const auth_token_url = "https://zoom.us/oauth/token";
          const api_base_url = "https://api.zoom.us/v2";



          async function createMeeting(topic, duration, start_date, start_time) {
            try {
              // Get the access token
              const authData = {
                grant_type: "account_credentials",
                account_id: account_id,
                client_secret: client_secret,
              };

              const authResponse = await axios.post(auth_token_url, null, {
                auth: {
                  username: client_id,
                  password: client_secret,
                },
                params: authData,
              });

              if (authResponse.status !== 200) {
                console.error("Unable to get access token");
                return;
              }

              const access_token = authResponse.data.access_token;

              // Create the meeting
              const headers = {
                Authorization: `Bearer ${access_token}`,
                "Content-Type": "application/json",
              };

              const payload = {
                topic: topic,
                duration: duration,
                start_time: `${start_date}T${start_time}`,
                type: 2,
              };

              const meetingResponse = await axios.post(`${api_base_url}/users/me/meetings`, payload, {
                headers: headers,
              });

              if (meetingResponse.status !== 201) {
                console.error("Unable to generate meeting link");
                return;
              }

              const response_data = meetingResponse.data;

              const content = {
                meeting_url: response_data.join_url,
                password: response_data.password,
                meetingTime: response_data.start_time,
                purpose: response_data.topic,
                duration: response_data.duration,
                message: "Success",
                status: 1,
              };

              console.log(content);



              res.send(content)
            } catch (error) {
              console.error(error.message);
            }
          }


          createMeeting(
            eventName,
            eventDuration,
            startDate,
            startTime
          );

        } catch (error) {
          console.error(error);
          res.status(500).json({ error: "Failed to create meeting" });
        }
      } else {
        try {
          const fs = require('fs').promises;
          const path = require('path');
          const process = require('process');
          const { authenticate } = require('@google-cloud/local-auth');
          const { google } = require('googleapis');

          // If modifying these scopes, delete token.json.
          const SCOPES = ['https://www.googleapis.com/auth/calendar'];
          // The file token.json stores the user's access and refresh tokens, and is
          // created automatically when the authorization flow completes for the first
          // time.
          const TOKEN_PATH = path.join(process.cwd(), 'token.json');
          const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

          /**
           * Reads previously authorized credentials from the save file.
           *
           * @return {Promise<OAuth2Client|null>}
           */
          async function loadSavedCredentialsIfExist() {
            try {
              const content = await fs.readFile(TOKEN_PATH);
              const credentials = JSON.parse(content);
              return google.auth.fromJSON(credentials);
            } catch (err) {
              return null;
            }
          }

          /**
           * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
           *
           * @param {OAuth2Client} client
           * @return {Promise<void>}
           */
          async function saveCredentials(client) {
            const content = await fs.readFile(CREDENTIALS_PATH);
            const keys = JSON.parse(content);
            const key = keys.installed || keys.web;
            const payload = JSON.stringify({
              type: 'authorized_user',
              client_id: key.client_id,
              client_secret: key.client_secret,
              refresh_token: client.credentials.refresh_token,
            });
            await fs.writeFile(TOKEN_PATH, payload);
          }

          /**
           * Load or request authorization to call APIs.
           *
           */
          async function authorize() {
            let client = await loadSavedCredentialsIfExist();
            if (client) {
              return client;
            }
            client = await authenticate({
              scopes: SCOPES,
              keyfilePath: CREDENTIALS_PATH,
            });
            if (client.credentials) {
              await saveCredentials(client);
            }
            return client;
          }

          /**
           * Create a new Google Calendar event with Google Meet link.
           *
           * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
           */
          async function createGoogleCalendarEvent(auth) {
            const calendar = google.calendar({ version: 'v3', auth });

            // Define the event details
            const eventDetails = {
              summary: 'Sample Event',
              location: 'Online', // You can set this to 'Online' for Google Meet events
              start: {
                dateTime: '2023-09-03T10:00:00', // Replace with your desired start time
                timeZone: 'America/New_York', // Replace with the desired time zone
              },
              end: {
                dateTime: '2023-09-03T11:00:00', // Replace with your desired end time
                timeZone: 'America/New_York', // Replace with the desired time zone
              },
              conferenceData: {
                createRequest: {
                  requestId: 'your-request-id', // Replace with your own request ID
                },
              },
            };

            try {
              const response = await calendar.events.insert({
                calendarId: 'primary', // Replace with your calendar ID
                resource: eventDetails,
                sendNotifications: true,
                conferenceDataVersion: 1,
              });

              const createdEvent = response.data;
              console.log('Event created:', createdEvent);

              // Get the Google Meet link
              const meetLink = createdEvent.hangoutLink;
              console.log('Google Meet link:', meetLink);

              const googleMeetLink = {
                meetLink: meetLink,
              }

              res.send(googleMeetLink)

            } catch (err) {
              console.error('Error creating event:', err);
            }
          }

          // Main function to authorize and create the Google Calendar event
          async function main() {
            try {
              const authClient = await authorize();
              await createGoogleCalendarEvent(authClient);
            } catch (error) {
              console.error('Error:', error);
            }
          }

          // Run the main function
          main();
        }catch(error) {
          console.log(error)
        }  
      }
    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("Plan Picker server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
