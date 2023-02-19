const express = require("express");
const fireStore = require("../config");

const { FieldValue } = require("firebase-admin/firestore");

const { body, validationResult } = require("express-validator");

const router = express.Router();

/*
    Add Feed API endpoint: http://host/api/feeds/addFeed
    method: POST
    {appId, caption} : required
*/
router.post(
	"/addFeed",
	body("appId", "Invalid app Id").isLength({ min: 2 }),
	body("caption", "Caption should be at least 5 characters long").isLength({
		min: 5,
	}),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const myError = errors["errors"][0]["msg"];
			return res.status(400).json({ errorMessage: myError });
		}

		try {
			const { appId, caption, image, userId } = req.body;

			const checkAppId = await fireStore
				.collection("allAppIDs")
				.doc(appId)
				.get();

			if (!checkAppId.exists) {
				// Create or Reasign app Id tynker email ID
				fireStore.collection("allAppIDs").doc(appId).set({
					id: appId,
				});
			}

			const createFeed = await fireStore.collection("feeds").doc();
			createFeed.set({
				appId: appId,
				feedId: createFeed.id,
				caption: caption,
				image: image,
				likes: {},
				userId: userId ? userId : "",
				timeStamp: FieldValue.serverTimestamp(),
			});

			res.status(200).send({ successMessage: "Feed added successfully" });
		} catch (error) {
			res.status(500).send({ errorMessage: "Pass valid values" });
		}
	}
);
/*
    Get Feeds API endpoint: http://host/api/feeds/getFeeds/:appId
    method: GET
*/
router.get("/getFeeds/:appId", async (req, res) => {
	try {
		const { appId } = req.params;

		const snapshot = await fireStore
			.collection("feeds")
			.where("appId", "==", appId)
			.orderBy('timeStamp', 'desc')
			.get();

		if (snapshot.empty) {
			return res
				.status(200)
				.json({ feeds: [], successMessage: "No feeds found!" });
		}

		let feedsData = [];

		snapshot.forEach((doc) => {
			feedsData.push(doc.data());
		});

		let updatedFeeds = [];
		for (let feed of feedsData) {
			let userId = feed["userId"];

			if (userId) {
				let userRef = await fireStore.collection("users").doc(userId).get();
				let user = userRef.data();
				feed["username"] = user["username"];
				feed["profileImage"] = user["profileImage"];
				updatedFeeds.push(feed);
			} else {
				feed["username"] = "Added by app";
				feed["profileImage"] =
					"https://procodingclass.github.io/tynker-vr-gamers-assets/assets/defaultProfileImage.png";
				updatedFeeds.push(feed);
			}
		}
        console.log(updatedFeeds)
		return res.status(200).json({ feeds: updatedFeeds });
	} catch (error) {
		console.log(error.message);
		res.status(500).send({ errorMessage: "Pass valid values" });
	}
});
/*
    likeFeed API endpoint: http://host/api/feeds/likeFeed/
    method: POST
*/
router.post("/likeFeed", async (req, res) => {
	try {
		const { appId, feedId, userId } = req.body;

		const feedRef = fireStore.collection("feeds").doc(feedId);
		const doc = await feedRef.get();

		if (!doc.exists) {
			return res
				.status(200)
				.json({ feed: {}, successMessage: "Feed id not exists" });
		} else {
			let likes = doc.data().likes;

			if (userId) {
				feedRef.update({
					[`likes.${userId}`]: likes[userId] ? !likes[userId] : true,
				});
			} else {
				feedRef.update({
					[`likes.${appId}`]: likes[appId] ? !likes[appId] : true,
				});
			}
			res
				.status(200)
				.send({ successMessage: "Feed likes handled successfully" });
		}
	} catch (error) {
		console.log(error.message);
		res.status(500).send({ errorMessage: "Pass valid values" });
	}
});


/*
    Add Comment API endpoint: http://host/api/feeds/addComment
    method: POST
    {caption} : required
*/
router.post(
	"/addComment",
	body("comment", "Invalid comment").isLength({ min: 1 }),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const myError = errors["errors"][0]["msg"];
			return res.status(400).json({ errorMessage: myError });
		}

		try {
			const { appId, feedId, comment, userId } = req.body;

			const createCommentId = await fireStore.collection("comments").doc();

			await createCommentId.set({
				commentId: createCommentId.id,
				appId: appId,
				feedId: feedId,
				comment: comment,
				userId: userId ? userId : "",
				timeStamp: FieldValue.serverTimestamp(),
			});

			res
				.status(200)
				.send({ data: {}, successMessage: "Comment added successfully" });
		} catch (error) {
			// console.log(error.message)
			res.status(500).send({ errorMessage: "Pass valid values" });
		}
	}
);


/*
    Get Comments API endpoint: http://host/api/feeds/getComments/:feedId
    method: GET
*/
router.get("/getComments/:appId/:feedId", async (req, res) => {
	try {
		const { appId, feedId } = req.params;

		const commentsRef = fireStore.collection("comments");
		const snapshot = await commentsRef
			.where("feedId", "==", feedId)
			.where("appId", "==", appId)
			.orderBy("timeStamp", "desc")
			.get();

		if (snapshot.empty) {
			return res
				.status(200)
				.json({ comments: [], successMessage: "No comments found" });
		}

		let commentsData = [];

		snapshot.forEach((doc) => {
			commentsData.push(doc.data());
		});
		let updatedCommentsData = [];
		for (let comment of commentsData) {
			let userId = comment["userId"];

			if (userId) {
				let userRef = await fireStore.collection("users").doc(userId).get();
				let user = userRef.data();
				comment["username"] = user["username"];
				comment["profileImage"] = user["profileImage"];
				updatedCommentsData.push(comment);
			} else {
				comment["username"] = "Added by app";
				comment["profileImage"] =
					"https://procodingclass.github.io/tynker-vr-gamers-assets/assets/defaultProfileImage.png";
				updatedCommentsData.push(comment);
			}
		}

		return res.status(200).json({ comments: updatedCommentsData });
	} catch (error) {
		res.status(500).send({ errorMessage: "Pass valid appId" });
	}
});

module.exports = router
