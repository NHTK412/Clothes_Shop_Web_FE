/* eslint-disable no-unused-vars */
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import routes from "./router/router";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <Router>
      <ToastContainer />
      <Routes>
        {routes.map((route) => {
          if (route.children) {
            return (
              <Route key={route.path} path={route.path} element={route.element}>
                {route.children.map((child, index) =>
                  child.index ? (
                    <Route key={index} index element={child.element} />
                  ) : (
                    <Route key={child.path} path={child.path} element={child.element} />
                  )
                )}
              </Route>
            );
          }
          return <Route key={route.path} path={route.path} element={route.element} />;
        })}
      </Routes>
    </Router>
  );
}

export default App;
