/*
 * Copyright 2017-2018 Allegro.pl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { day, second } from "chronoshift";
import { r, Range, TimeRange } from "plywood";
import * as React from "react";
import { Clicker } from "../../../common/models/clicker/clicker";
import { Dimension } from "../../../common/models/dimension/dimension";
import { Essence } from "../../../common/models/essence/essence";
import { Filter } from "../../../common/models/filter/filter";
import { isValidTimeShift, TimeShift } from "../../../common/models/time-shift/time-shift";
import { Timekeeper } from "../../../common/models/timekeeper/timekeeper";
import { Fn } from "../../../common/utils/general/general";
import { STRINGS } from "../../config/constants";
import { Button } from "../button/button";
import { DateRangePicker } from "../date-range-picker/date-range-picker";
import { TimeShiftSelector } from "./time-shift-selector";

export interface FixedTimeTabProps {
  essence: Essence;
  timekeeper: Timekeeper;
  dimension: Dimension;
  onClose: Fn;
  clicker: Clicker;
}

export interface FixedTimeTabState {
  start: Date;
  end: Date;
  shift: string;
}

export class FixedTimeTab extends React.Component<FixedTimeTabProps, FixedTimeTabState> {

  initialState = (): FixedTimeTabState => {
    const { essence, timekeeper, dimension } = this.props;

    const dimensionExpression = dimension.expression;
    const selectedTimeRangeSet = essence.getEffectiveFilter(timekeeper).getLiteralSet(dimensionExpression);
    let selectedTimeRange = (selectedTimeRangeSet && selectedTimeRangeSet.size() === 1) ? selectedTimeRangeSet.elements[0] : null;
    const isSelectedRangeValid = selectedTimeRange && !Range.isRange(selectedTimeRange);
    if (isSelectedRangeValid) {
      selectedTimeRange = new TimeRange({
        start: second.shift(selectedTimeRange, essence.timezone, -1),
        end: second.shift(selectedTimeRange, essence.timezone, 1)
      });
    }
    return {
      start: selectedTimeRange ? selectedTimeRange.start : null,
      end: selectedTimeRange ? selectedTimeRange.end : null,
      shift: essence.timeShift.toJS()
    };
  }

  onStartChange = (start: Date) => this.setState({ start });

  onEndChange = (end: Date) => this.setState({ end });

  setTimeShift = (shift: string) => this.setState({ shift });

  state: FixedTimeTabState = this.initialState();

  validate(): boolean {
    return this.validateFilter() || this.validateTimeShift();
  }

  validateTimeShift(): boolean {
    const { shift } = this.state;
    return isValidTimeShift(shift) && !this.props.essence.timeShift.equals(TimeShift.fromJS(shift));
  }

  validateFilter(): boolean {
    try {
      const newFilter = this.constructFixedFilter();
      return !this.props.essence.filter.equals(newFilter);
    } catch {
      return false;
    }
  }

  constructFixedFilter(): Filter {
    let { start, end } = this.state;
    const { essence: { filter, timezone }, dimension } = this.props;

    if (!start) {
      throw new Error("Couldn't construct time filter: No starting date.");
    }

    if (!end) {
      end = day.shift(start, timezone, 1);
    }

    if (start >= end) {
      throw new Error("Couldn't construct time filter: Start should be earlier than end.");
    }
    return filter.setSelection(dimension.expression, r(TimeRange.fromJS({ start, end })));
  }

  constructTimeShift(): TimeShift {
    return TimeShift.fromJS(this.state.shift);
  }

  onOkClick = () => {
    if (!this.validate()) return;
    const { clicker, onClose } = this.props;
    clicker.changeFilter(this.constructFixedFilter());
    clicker.changeComparisonShift(this.constructTimeShift());
    onClose();
  }

  render() {
    const { essence, timekeeper, dimension } = this.props;
    if (!dimension) return null;
    const { shift, start, end } = this.state;

    return <div>
      <DateRangePicker
        startTime={start}
        endTime={end}
        maxTime={essence.dataCube.getMaxTime(timekeeper)}
        timezone={essence.timezone}
        onStartChange={this.onStartChange}
        onEndChange={this.onEndChange}
      />
      <div className="cont">
        <TimeShiftSelector
          shift={shift}
          time={TimeRange.fromJS({ start, end })}
          onShiftChange={this.setTimeShift}
          timezone={essence.timezone}
          shiftValue={isValidTimeShift(shift) ? TimeShift.fromJS(shift) : null}
          errorMessage={!isValidTimeShift(shift) && STRINGS.invalidDurationFormat}
        />
      </div>
      <div className="ok-cancel-bar">
        <Button type="primary" onClick={this.onOkClick} disabled={!this.validate()} title={STRINGS.ok}/>
        <Button type="secondary" onClick={this.props.onClose} title={STRINGS.cancel}/>
      </div>
    </div>;
  }
}
