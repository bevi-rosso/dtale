import { mount } from "enzyme";
import React from "react";
import Modal from "react-bootstrap/Modal";
import { Provider } from "react-redux";

import { expect, it } from "@jest/globals";

import { RemovableError } from "../../RemovableError";
import DimensionsHelper from "../DimensionsHelper";
import mockPopsicle from "../MockPopsicle";
import reduxUtils from "../redux-test-utils";

import { buildInnerHTML, clickMainMenuButton, mockChartJS, tick, tickUpdate, withGlobalJquery } from "../test-utils";

const toggleFilterMenu = async result => {
  clickMainMenuButton(result, "Custom Filter");
  await tickUpdate(result);
};

describe("DataViewer tests", () => {
  let result, Filter, DataViewerInfo;
  let dataId = 0;
  const { open } = window;
  const dimensions = new DimensionsHelper({
    offsetWidth: 500,
    offsetHeight: 500,
    innerWidth: 1205,
    innerHeight: 775,
  });

  beforeAll(() => {
    dimensions.beforeAll();

    delete window.open;
    window.open = jest.fn();

    const mockBuildLibs = withGlobalJquery(() =>
      mockPopsicle.mock(url => {
        const { urlFetcher } = require("../redux-test-utils").default;
        return urlFetcher(url);
      })
    );
    mockChartJS();
    jest.mock("popsicle", () => mockBuildLibs);

    Filter = require("../../popups/Filter").ReactFilter;
    DataViewerInfo = require("../../dtale/info/DataViewerInfo").ReactDataViewerInfo;
  });

  beforeEach(async () => {
    const { DataViewer } = require("../../dtale/DataViewer");
    const store = reduxUtils.createDtaleStore();
    const finalDataId = dataId === 2 ? "error" : dataId + "";
    buildInnerHTML({ settings: "", dataId: finalDataId }, store);
    dataId++;
    result = mount(
      <Provider store={store}>
        <DataViewer />
      </Provider>,
      {
        attachTo: document.getElementById("content"),
      }
    );
    await tick();
    await toggleFilterMenu(result);
  });

  afterAll(() => {
    dimensions.afterAll();
    window.open = open;
  });

  it("DataViewer: filtering", async () => {
    expect(result.find(Filter).length).toBe(1);
    result.find(Modal.Header).first().find("button").simulate("click");
    result.update();
    expect(result.find(Filter).length).toBe(0);
    await toggleFilterMenu(result);
    result.find(Filter).first().find("div.modal-footer").first().find("button").at(1).simulate("click");
    await tickUpdate(result);
    expect(result.find(Filter).length).toBe(0);
    await toggleFilterMenu(result);
    result
      .find(Filter)
      .first()
      .find("textarea")
      .simulate("change", { target: { value: "test" } });
    result.update();
    result.find(Filter).first().find("button").last().simulate("click");
    await tickUpdate(result);
    expect(result.find(DataViewerInfo).first().text()).toBe("Filter:test");
    result.find(DataViewerInfo).first().find("i.ico-cancel").last().simulate("click");
    await tickUpdate(result);
    expect(result.find(DataViewerInfo).find("div.data-viewer-info.is-expanded").length).toBe(0);
  });

  it("DataViewer: filtering with errors & documentation", async () => {
    result
      .find(Filter)
      .first()
      .find("textarea")
      .simulate("change", { target: { value: "error" } });
    result.update();
    result.find(Filter).first().find("button").last().simulate("click");
    await tickUpdate(result);
    expect(result.find(RemovableError).find("div.dtale-alert").text()).toBe("No data found");
    result.find(Filter).find(RemovableError).first().instance().props.onRemove();
    result.update();
    expect(result.find(Filter).find("div.dtale-alert").length).toBe(0);
    result.find(Filter).find("div.modal-footer").find("button").first().simulate("click");
    const pandasURL = "https://pandas.pydata.org/pandas-docs/stable/user_guide/indexing.html#indexing-query";
    expect(window.open.mock.calls[window.open.mock.calls.length - 1][0]).toBe(pandasURL);
  });

  test("DataViewer: filtering, context variables error", () => {
    expect(result.find(Filter).find(RemovableError).find("div.dtale-alert").text()).toBe(
      "Error loading context variables"
    );
  });

  it("DataViewer: column filters", async () => {
    const mainCol = result.find(Filter).find("div.col-md-12.h-100");
    expect(mainCol.text()).toBe("Active Column Filters:foo == 1 andCustom Filter:foo == 1");
    mainCol.find("i.ico-cancel").first().simulate("click");
    await tick();
    expect(result.find(Filter).find("div.col-md-12.h-100").text()).toBe("Custom Filter:foo == 1");
  });
});
