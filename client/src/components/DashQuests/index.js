import React from "react";
import { Link } from 'react-router-dom';

const DashPosts = ({posts, title}) => {
    if(!posts.length) {
        return <h3 className="text-black text-xl lg:py-10">You don't have any quests</h3>
    }

    return (
        <div>
            <h3 className="font">{title}</h3>
            {posts && posts.map(post => (
                <div key={post._id}>
                    <div className='post-title-dash'>
                        <Link to={`/post/${post._id}`}><h3 className="font">{post.postTitle}</h3></Link>
                    </div>
                    {/* <div className='post-content-dash'>
                        <p className="font">{post.postContent}</p>
                    </div> */}
                    <div className='post-footer-dash'>
                        <p className="font">Posted on {post.createdAt}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default DashPosts;