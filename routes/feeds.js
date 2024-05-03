const express = require('express');
const fireStore = require('../config');

const { FieldValue } = require('firebase-admin/firestore');

const { body, validationResult } = require('express-validator');

const router = express.Router();

/*
    Add Feed API endpoint: http://host/api/feeds/addFeed
    method: POST
    {appId, caption} : required
*/
router.post(
	'/addFeed',
	body('appId', 'Invalid app Id').isLength({ min: 2 }),
	body('caption', 'Caption should be at least 5 characters long').isLength({
		min: 5,
	}),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const myError = errors['errors'][0]['msg'];
			return res.status(400).json({ errorMessage: myError });
		}

		try {
			const { appId, caption, image, userId } = req.body;

			const checkAppId = await fireStore.collection('allAppIDs').doc(appId).get();

			if (!checkAppId.exists) {
				// Create or Reasign app Id tynker email ID
				fireStore.collection('allAppIDs').doc(appId).set({
					id: appId,
				});
			}

			const createFeed = await fireStore.collection('feeds').doc();
			createFeed.set({
				appId: appId,
				feedId: createFeed.id,
				caption: caption,
				image: image,
				likes: {},
				userId: userId ? userId : '',
				timeStamp: FieldValue.serverTimestamp(),
			});

			res.status(200).send({ successMessage: 'Feed added successfully' });
		} catch (error) {
			res.status(500).send({ errorMessage: 'Pass valid values' });
		}
	}
);
/*
    Get Feeds API endpoint: http://host/api/feeds/getFeeds/:appId
    method: GET
*/
router.get('/getFeeds', async (req, res) => {
	try {
		const { appId } = req.query;

		const snapshot = await fireStore
			.collection('feeds')
			.where('appId', '==', appId)
			.orderBy('timeStamp', 'desc')
			.get();

		if (snapshot.empty) {
			return res
				.status(200)
				.json({ feeds: [], successMessage: 'No feeds found!' });
		}

		let feedsData = [];

		snapshot.forEach((doc) => {
			feedsData.push(doc.data());
		});

		let updatedFeeds = [];
		for (let feed of feedsData) {
			let userId = feed['userId'];

			if (userId) {
				let userRef = await fireStore.collection('users').doc(userId).get();
				let user = userRef.data();
				feed['username'] = user['username'];
				feed['profileImage'] = user['profileImage'];
				updatedFeeds.push(feed);
			} else {
				feed['username'] = 'Added by app';
				feed['profileImage'] =
					'https://procodingclass.github.io/tynker-vr-gamers-assets/assets/defaultProfileImage.png';
				updatedFeeds.push(feed);
			}
		}

		return res.status(200).json({ feeds: updatedFeeds });
	} catch (error) {
		return res.status(500).send({ errorMessage: 'Pass valid values' });
	}
});

/*
    Get MyFeeds API endpoint: http://host/api/feeds/getMyFeeds/:appId/:userid
    method: GET
*/
router.get('/getMyFeeds/:appId/:userId', async (req, res) => {
	try {
		const { appId, userId } = req.params;

		const snapshot = await fireStore
			.collection('feeds')
			.where('appId', '==', appId)
			.where('userId', '==', userId)
			.orderBy('timeStamp', 'desc')
			.get();

		if (snapshot.empty) {
			return res
				.status(200)
				.json({ feeds: [], successMessage: 'No feeds found!' });
		}

		let feedsData = [];

		snapshot.forEach((doc) => {
			feedsData.push(doc.data());
		});

		let updatedFeeds = [];
		for (let feed of feedsData) {
			let userId = feed['userId'];

			if (userId) {
				let userRef = await fireStore.collection('users').doc(userId).get();
				let user = userRef.data();
				feed['username'] = user['username'];
				feed['profileImage'] = user['profileImage'];
				updatedFeeds.push(feed);
			} else {
				feed['username'] = 'Added by app';
				feed['profileImage'] =
					'https://procodingclass.github.io/tynker-vr-gamers-assets/assets/defaultProfileImage.png';
				updatedFeeds.push(feed);
			}
		}

		return res.status(200).json({ feeds: updatedFeeds });
	} catch (error) {
		return res.status(500).send({ errorMessage: 'Pass valid values' });
	}
});
/*
    likeFeed API endpoint: http://host/api/feeds/likeFeed/
    method: POST
*/
router.post('/likeFeed', async (req, res) => {
	try {
		const { appId, feedId, userId } = req.body;

		const feedRef = fireStore.collection('feeds').doc(feedId);
		const doc = await feedRef.get();

		if (!doc.exists) {
			return res
				.status(200)
				.json({ feed: {}, successMessage: 'Feed id not exists' });
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
			return res
				.status(200)
				.send({ successMessage: 'Feed likes handled successfully' });
		}
	} catch (error) {
		return res.status(500).send({ errorMessage: 'Pass valid values' });
	}
});

/*
    Add Comment API endpoint: http://host/api/feeds/addComment
    method: POST
    {caption} : required
*/
router.post(
	'/addComment',
	body('comment', 'Invalid comment').isLength({ min: 1 }),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const myError = errors['errors'][0]['msg'];
			return res.status(400).json({ errorMessage: myError });
		}

		try {
			const { appId, feedId, comment, userId } = req.body;

			const createCommentId = await fireStore.collection('comments').doc();

			await createCommentId.set({
				commentId: createCommentId.id,
				appId: appId,
				feedId: feedId,
				comment: comment,
				userId: userId ? userId : '',
				timeStamp: FieldValue.serverTimestamp(),
			});

			return res
				.status(200)
				.send({ data: {}, successMessage: 'Comment added successfully' });
		} catch (error) {
			return res.status(500).send({ errorMessage: 'Pass valid values' });
		}
	}
);

/*
    Get Comments API endpoint: http://host/api/feeds/getComments/:feedId
    method: GET
*/
router.get('/getComments/:appId/:feedId', async (req, res) => {
	try {
		const { appId, feedId } = req.params;

		const commentsRef = fireStore.collection('comments');
		const snapshot = await commentsRef
			.where('feedId', '==', feedId)
			.where('appId', '==', appId)
			.orderBy('timeStamp', 'desc')
			.get();

		if (snapshot.empty) {
			return res
				.status(200)
				.json({ comments: [], successMessage: 'No comments found' });
		}

		let commentsData = [];

		snapshot.forEach((doc) => {
			commentsData.push(doc.data());
		});
		let updatedCommentsData = [];
		for (let comment of commentsData) {
			let userId = comment['userId'];

			if (userId) {
				let userRef = await fireStore.collection('users').doc(userId).get();
				let user = userRef.data();
				comment['username'] = user['username'];
				comment['profileImage'] = user['profileImage'];
				updatedCommentsData.push(comment);
			} else {
				comment['username'] = 'Added by app';
				comment['profileImage'] =
					'https://procodingclass.github.io/tynker-vr-gamers-assets/assets/defaultProfileImage.png';
				updatedCommentsData.push(comment);
			}
		}

		return res.status(200).json({ comments: updatedCommentsData });
	} catch (error) {
		res.status(500).send({ errorMessage: 'Pass valid appId' });
	}
});

/*
    Get Feeds API endpoint: http://host/api/feeds/getUsers/:appId
    method: GET
*/
router.get('/getUsers/:appId', async (req, res) => {
	try {
		const { appId } = req.params;

		const usersRef = fireStore.collection('users');
		const snapshot = await usersRef.where('appId', '==', appId).get();
		if (snapshot.empty) {
			return res.status(200).json({ users: 'No users found' });
		}
		let usersData = [];
		snapshot.forEach((doc) => {
			usersData.push(doc.data());
		});
		return res.status(200).json({ users: usersData });
	} catch (error) {
		return res.status(500).send({ 'error_message ': 'Pass valid appId' });
	}
});
/*
    Get Feeds API endpoint: http://host/api/feeds/getComments/:appId
    method: GET
*/
router.get('/getComments/:appId', async (req, res) => {
	try {
		const { appId } = req.params;

		const commentsRef = fireStore.collection('comments');
		const snapshot = await commentsRef.where('appId', '==', appId).get();
		if (snapshot.empty) {
			return res.status(200).json({ comments: 'No comments found' });
		}
		let commentsData = [];
		snapshot.forEach((doc) => {
			commentsData.push(doc.data());
		});
		return res.status(200).json({ comments: commentsData });
	} catch (error) {
		return res.status(500).send({ 'error_message ': 'Pass valid appId' });
	}
});

/*
    Add Reply API endpoint: http://host/api/feeds/addReply
    method: POST
    {caption} : required
*/
router.post(
	'/addReply',
	body('reply', 'Invalid reply').isLength({ min: 1 }),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const myError = errors['errors'][0]['msg'];
			return res.status(400).json({ errorMessage: myError });
		}

		try {
			const { commentId, reply, userId } = req.body;

			const createReplyId = await fireStore.collection('replies').doc();

			await createReplyId.set({
				replyId: createReplyId.id,
				commentId: commentId,
				reply: reply,
				userId: userId ? userId : '',
				timeStamp: FieldValue.serverTimestamp(),
			});

			return res
				.status(200)
				.send({ data: {}, successMessage: 'Reply added successfully' });
		} catch (error) {
			return res.status(500).send({ errorMessage: 'Pass valid values' });
		}
	}
);

/*
    Get Replies API endpoint: http://host/api/feeds/getReplies/:replyId
    method: GET
*/
router.get('/getReplies/:commentId', async (req, res) => {
	try {
		const { commentId } = req.params;

		const repliesRef = fireStore.collection('replies');
		const snapshot = await repliesRef.where('commentId', '==', commentId).get();

		if (snapshot.empty) {
			return res
				.status(200)
				.json({ replies: [], successMessage: 'No replies found' });
		}

		let repliesData = [];

		snapshot.forEach((doc) => {
			repliesData.push(doc.data());
		});
		let updatedRepliesData = [];
		for (let reply of repliesData) {
			let userId = reply['userId'];

			if (userId) {
				let userRef = await fireStore.collection('users').doc(userId).get();
				let user = userRef.data();
				reply['username'] = user['username'];
				reply['profileImage'] = user['profileImage'];
				updatedRepliesData.push(reply);
			} else {
				reply['username'] = 'Added by app';
				reply['profileImage'] =
					'https://procodingclass.github.io/tynker-vr-gamers-assets/assets/defaultProfileImage.png';
				updatedRepliesData.push(reply);
			}
		}

		return res.status(200).json({ replies: updatedRepliesData });
	} catch (error) {
		res.status(500).send({ errorMessage: 'Pass valid appId' });
	}
});

/*
	Get Comments API endpoint: http://host/api/feeds/deleteFeed
	method: DELETE
	{appId, feedId} : required
	{userId} : optional
*/
router.delete(
	'/deleteFeed',
	body('feedId', 'Invalid feed Id').isLength({ min: 2 }),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const myError = errors['errors'][0]['msg'];
			return res.status(400).json({ errorMessage: myError });
		}

		try {
			const { feedId } = req.body;

			const deleteFeedQuery = await fireStore
				.collection('feeds')
				.doc(feedId)
				.delete();

			let deleteCommentQuery = await fireStore
				.collection('comments')
				.where('feedId', '==', feedId)
				.get();

			await deleteCommentQuery.forEach((doc) => {
				doc.ref.delete();
			});

			return res.status(200).send({ successMessage: 'Feed deleted successfully' });
		} catch (error) {
			return res.status(500).send({ errorMessage: 'Pass valid values' });
		}
	}
);

module.exports = router;
