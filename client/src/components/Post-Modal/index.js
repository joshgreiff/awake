import React, { useState } from "react";
import { useMutation } from '@apollo/client'

import { ADD_POST } from '../../utils/mutations'

import './Modal.css'


export default function Modal({ closeModalPost }){
    const [postTitle, setPostTitle] = useState('')
    const [postContent, setPostContent] = useState('')

    const [addPost, { data, loading, error }] = useMutation(ADD_POST)

    const handleSubmit = async event => {
        event.preventDefault()
        
        try {
            await addPost({
                variables: { postTitle, postContent }
            })

            setPostTitle('')
            setPostContent('')
            window.location.reload()
        } catch(e) {
            console.error(e)
        }
    }

    const handleChangeTitle = event => {
        if(event.target.value.length){
            setPostTitle(event.target.value)
        }
    }

    const handleChangeContent = event => {
        if(event.target.value.length){
            setPostContent(event.target.value)
        }
    }


    return(
        <div className="modalBackground z-10 text-white dashboard" >
            <div className="modalContainer">
                <div className="titleCloseBtn">
                    <button onClick={() => closeModalPost(false)}>X</button>
                </div>
                <div className="title text-xl font">
                    <h2 className="font">Create a Post</h2>
                </div>
                
                <div className="body">
                    
                    <form className='flex flex-col' onSubmit={handleSubmit}>
                        <input className='mb-5 flex "block p-2.5  text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
                        placeholder="Post Title"
                        onChange={handleChangeTitle}

                        // value={questTitle}
                        ></input>
                        <textarea
                            placeholder="Post Content"
                            // value={questDescription}
                            className='flex "block p-2.5  text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
                            onChange={handleChangeContent}
                        ></textarea>
                        <div className="footer">
                        <button className='cancelBtn' type='submit'>
                            Submit
                        </button>
                    <button className="font" id="cancelBtn" onClick={() => closeModalPost(false)}>Cancel</button>
                </div>
                    </form>
                </div>
                
            </div>
        </div>
    )
}