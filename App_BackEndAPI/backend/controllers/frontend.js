import Post from "../models/Post.js";
import User from "../models/User.js";

export const getPagedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.currentUser._id)
      .populate({
        path: "connections",
        select: "posts username profilePicture",
        populate: {
          path: "posts",
          model: "Post",
        },
      })
      .populate("posts")
      .lean();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let allPosts = [
      ...user.posts.map((post) => ({
        postId: post._id,
        caption: post.caption || "",
        image: null, // No image for now
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        username: user.username,
        liked:
          post.likedBy &&
          post.likedBy.some((id) => id.equals(req.currentUser._id)),
        profilePicture: resizeImage(user.profilePicture),
        likeCount: post.likeCount || post.likedBy.length,
      })),
      ...user.connections.flatMap((connection) =>
        connection.posts.map((post) => ({
          postId: post._id,
          caption: post.caption || "",
          image: null, // No image for now
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          username: connection.username,
          liked:
            post.likedBy &&
            post.likedBy.some((id) => id.equals(req.currentUser._id)),
          profilePicture: resizeImage(connection.profilePicture),
          likeCount: post.likeCount || post.likedBy.length,
        }))
      ),
    ];

    allPosts = allPosts.sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );

    // Paginate the posts
    const pagedPosts = allPosts.slice(skip, skip + limit);

    res.status(200).json({
      posts: pagedPosts,
      totalPosts: allPosts.length,
      currentPage: page,
      totalPages: Math.ceil(allPosts.length / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPostImage = async (req, res) => {
  try {
    const postId = req.params.postId;

    // Find the post by its ID and select the image
    const post = await Post.findById(postId).select("image");

    if (!post || !post.image) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Convert the image buffer to base64
    const base64Image = post.image.toString("base64");
    const imageData = `data:image/jpeg;base64,${base64Image}`;

    res.status(200).json({ image: imageData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
