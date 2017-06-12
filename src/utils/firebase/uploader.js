import firebaseConnection from './connection';
import convertFPS from '../convertFPS';

const generateTokenURL = 'https://us-central1-you-move-me.cloudfunctions.net/getUploadToken';
const processSubmissionURL = 'https://us-central1-you-move-me.cloudfunctions.net/processSubmission';

const storageRef = firebaseConnection.firebase.storage().ref();


const requestUploadToken = (roomID) =>
      firebaseConnection.contactServer(generateTokenURL, { room: roomID });

const uploadDataString = (dataString, filename, uploadToken) => {
  const promise = new Promise((resolve, reject) => {
    const targetFileRef = storageRef.child(`_incoming/${filename}`);

    // metadata we want to store with the file
    const metadata = {
      contentType: 'application/json',
      customMetadata: {
        token: uploadToken,
      },
    };

    const uploadTask = targetFileRef.putString(dataString, undefined, metadata);

    uploadTask.on('state_changed', () => { // progress
      // uploadTask.on('state_changed', (snapshot) => { // progress
      // const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      // console.log('Upload is ' + progress + '% done');
      // TODO: emit upload progress events
    }, (error) => { // error
      reject(error);
    }, () => { // complete
      resolve(uploadTask.snapshot.downloadURL);
    });
  });

  return promise;
};

const startSubmissionProcessing = (token) =>
      firebaseConnection.contactServer(processSubmissionURL, { token });

const firebaseUploader = {
  upload: async (roomData, roomID, callback) => {
    try {
      // Request an upload token
      const { uri_array, token } = await requestUploadToken(roomID);
      // Wait for all uploads to complete
      await Promise.all(
        uri_array.map(([fps, filename]) => (
          uploadDataString(
            (
              fps === 90
                ? roomData
                : convertFPS(roomData, fps)
            ).map(JSON.stringify).join('\n'),
            filename,
            token
          )
        ))
      );

      // now process files
      const { id } = await startSubmissionProcessing(token);
      // file processing is done, the recording is saved!
      callback(null, id);
    } catch (error) {
      callback(error);
    }
  },
};

export default firebaseUploader;