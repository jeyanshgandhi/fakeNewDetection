const mongoo = require("mongoose")
const express = require("express")
const bodyParser = require('body-parser')
const cors = require("cors")
const fetchNYTNews = require('./nytApi')
const fs = require('fs')
const {CountVectorizer} = require('./count')
// const DecisionTreeClassifier = require('./fakeModel');
// const {RandomForestClassifier} = require('scikit-learn');

const vocabulary = JSON.parse(fs.readFileSync("multinomial_nb_vocabulary.json", "utf-8"));
const modelParams = JSON.parse(fs.readFileSync("multinomial_nb_model_params.json", "utf-8"));


const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors())


mongoo.connect("mongodb://localhost:27017/FakeNewsdb")
.then(()=>{
    console.log("mongoDB connected")
})
.catch(()=>{
    console.log("mongooDB failed to connect!")
})

const newSchema = new mongoo.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    securityAnswer: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
})

const collection = mongoo.model("collection", newSchema);


app.post("/login", async(req, res)=>{
    const {email,password} = req.body;

    try{
        const check = await collection.findOne({email: email})

        if(!check){
            res.json("not exist")
        }
        else if(check.password === password){
            res.json("exist")
        }
        else{
            res.json("incorrect")
        }

    }
    catch(e){
        res.json("notexist")
    }

})

app.post("/signin", async(req, res)=>{
    const {name, email, securityAnswer, password} = req.body;

    const data = {
        name: name,
        email: email,
        securityAnswer: securityAnswer,
        password: password
    }

    try{
        const check = await collection.findOne({email: email})

        if(check){
            res.json("exist")
        }
        else{
            res.json("not exist")
            await collection.insertMany([data])
        }

    }
    catch(e){
        res.json("not exist")
    }

})

app.post("/forgot", async (req, res) => {
    const { email, securityAnswer, newPassword, confirmPassword } = req.body;

    try {
        const check = await collection.findOne({ email });

        if (!check) {
            return res.status(404).send('User not found');
        }

        if (check.securityAnswer !== securityAnswer) {
            return res.status(403).send('Incorrect answer to security question');
            // return res.json('security answer')
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).send('Passwords do not match');
        }

        else{
        check.password = newPassword;
        await check.save();
        return res.status(200).send('Password reset successful');
        }
    } catch (error) {
        console.error("Error resetting password:", error);
        return res.status(500).send('Internal Server Error');
    }
});






app.post("/api/news", async (req, res) => {
    try {
        const newsData = await fetchNYTNews(); // Fetch news from New York Times API
        res.json(newsData);
    } catch (error) {
        console.error('Error fetching news from New York Times:', error);
        res.status(500).json({ error: 'Error fetching news from New York Times' });
    }
});

app.use(bodyParser.json())

const VC = new CountVectorizer({ vocabulary: Object.keys(vocabulary) });
const { class_prior, feature_log_prob } = modelParams;

function predict(author, title) {
    // Transform the input title into a feature vector
    const titleVector = VC.transform([author+' '+title]);

    // Calculate the log probabilities for each class
    const logProbabilities = [];
    for (let i = 0; i < feature_log_prob.length; i++) {
        let logProb = 0.0;
        for (let j = 0; j < titleVector[0].length; j++) {
            logProb += titleVector[0][j] * feature_log_prob[i][j];
        }
        logProb += class_prior[i];
        logProbabilities.push(logProb);
    }

    // Find the index of the class with the highest log probability
    const predictedclass = logProbabilities.indexOf(Math.max(...logProbabilities));
    const prediction = predictedclass === 0 ? "real" : "fake";

    const probabilities = logProbabilities.map(logProb => Math.exp(logProb))
    console.log("probability:", probabilities)

    return prediction;
}


app.post('/predict', (req, res) => {
    const isLoggedIn = req.headers['authorization'];

    if (!isLoggedIn || isLoggedIn.toLowerCase() !== "true") {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { author, article } = req.body; 
    if (!article || article.trim() === "" || !author || author.trim() === "") {
        return res.status(400).json({ error: "Author and Article title are required" }); 
    }


    // Make prediction using the loaded model
    const prediction = predict(author, article);

    res.json({ prediction });
});

app.listen(9002,()=>{
    console.log("port connected")
})