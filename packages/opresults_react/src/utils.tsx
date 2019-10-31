import React from "react";

//https://github.com/DefinitelyTyped/DefinitelyTyped/issues/37087#issuecomment-542793243
export const typedMemo: <T>(c: T) => T = React.memo;
