import {StrictMode} from "react";
import * as ReactDOM from "react-dom";

//app config: https://github.com/nrwl/nx/issues/7924

import TeranexController from "./app/teranexController";

ReactDOM.render(
    <StrictMode>
        <TeranexController />
    </StrictMode>,
    document.getElementById("root")
);
