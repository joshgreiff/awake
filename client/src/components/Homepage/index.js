import React from 'react'
import { Link } from 'react-router-dom'
import hero from "../../assets/Hero/sunset.png";

export default function Home() {
    return (
        <div>
            <body>
                <div className="relative">
                    <div className="w-screen relative test flex items-center justify-center"
                        style={{
                            backgroundSize: "cover",
                            backgroundAttachment: "auto",
                            backgroundImage: `url(${hero})`,
                        }}>
                        <div className="hp-text">
                            <h1 className="relative text-4xl md:text-6xl text-white bg-transparent py-2">Change the way you think about your goals</h1>
                            <h2 className="relative text-2xl md:text-xl text-white bg-transparent py-1.5">Click create a quest below to begin your journey</h2><br />
                            <Link to="/dashboard">
                                <button className="relative bg-blue-500 rounded-lg overflow-hidden text-white px-5 py-2.5 group">
                                    <span className="absolute w-0 group-hover:w-full transition-all ease-out duration-300 h-full bg-pink-600 left-0 top-0"></span>
                                    <span className="relative bg-transparent">Create A Quest</span>
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </body>
        </div>
    )
}
