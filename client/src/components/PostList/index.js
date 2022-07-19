import React from 'react';
import { Link } from 'react-router-dom'

import profilepic from '../../assets/profile/profile-pic.png';


export default function PostList({ posts }) {
    if(!posts.length) {
        return <h3 className="text-white">No Posts Yet</h3>
    }
    
    return (
        <div className='w-screen'>
            {posts && posts.map(post => (
                <div key={post._id} className='my-4 bg-slate-400 mx-8 rounded-md border-gray-600 border-solid flex'>
                    <div className='inline profile-div text-center bg-slate-600 rounded-l-md'>
                        <img src={profilepic} alt="profile" className='profile-pic mx-auto'></img>
                        <p className='font'><Link to={`/profile/${post.username}`} className="text-gray-200 hover:text-gray-400">{post.username}</Link></p>
                    </div>
                    <div className='inline w-screen'>
                        <div className='post-title bg-slate-500 rounded-tr-md hover:bg-slate-600'>
                            <Link to={`/post/${post._id}`}><h3 className='text-indigo-50 ml-4 text-2xl font'>{post.postTitle}</h3></Link>
                        </div>
                        <div className='post-content'>
                            <p className='ml-4 text-xl font text-gray-700'>{post.postContent}</p>
                        </div>
                        <div className='post-footer bg-slate-600 rounded-br-md'>
                            <p className='ml-4 text-xs font text-gray-900'>Posted on {post.createdAt}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}