import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import Home from "./page/Home";
import Attendance from "./page/Attendance";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    index: true,
  },
  {
    path: "/attendance",
    element: <Attendance />,
  },
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Analytics />
    </>
  );
}

export default App;
