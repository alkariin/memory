import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import WordList from "./components/WordList";
import AddWord from "./components/AddWord";
import Review from "./components/Review";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { path: "/", Component: Review },
      { path: "/add", Component: AddWord },
      { path: "/edit/:id", Component: AddWord },
      { path: "/list", Component: WordList },
      { path: "/review", Component: Review },
    ],
  },
], { basename: import.meta.env.BASE_URL });
