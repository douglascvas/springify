'use strict';

import * as chai from "chai";
import {Filter, FilterAnnotation} from "../../../../main/web/filter/Filter";
import {FilterInfo} from "../../../../main/web/filter/FilterInfo";
import {ServiceInfo} from "../../../../main/di/service/ServiceInfo";
import {ServiceAnnotation} from "../../../../main/di/service/ServiceAnnotation";
import {ClassMetadata} from "../../../../main/core/ClassMetadata";

const assert = chai.assert;

describe('Filter', function () {

  it('should register filter without parameters', async function () {
    // given
    let classMetadata: ClassMetadata = ClassMetadata.getOrCreateClassMetadata(FilterWithoutParameters);
    let filter: FilterInfo = (<FilterAnnotation>classMetadata.getClassAnnotation(FilterAnnotation.className)).filterInfo;
    let service: ServiceInfo = (<ServiceAnnotation>classMetadata.getClassAnnotation(ServiceAnnotation.className)).serviceInfo;

    // then
    assert.equal(filter.name, null);
    assert.equal(filter.classz, FilterWithoutParameters);

    assert.equal(service.name, null);
    assert.equal(service.skipParentRegistration, null);
    assert.equal(service.dependencies, null);
    assert.equal(service.classz, FilterWithoutParameters);
  });

  it('should register filter with parameters', async function () {
    // given
    let classMetadata: ClassMetadata = ClassMetadata.getOrCreateClassMetadata(FilterWithParameters);
    let filter: FilterInfo = (<FilterAnnotation>classMetadata.getClassAnnotation(FilterAnnotation.className)).filterInfo;
    let service: ServiceInfo = (<ServiceAnnotation>classMetadata.getClassAnnotation(ServiceAnnotation.className)).serviceInfo;

    // then
    assert.equal(filter.name, 'testFilter');
    assert.equal(filter.classz, FilterWithParameters);
    assert.deepEqual(filter.dependencies, ['dep1', Dep2]);
    assert.equal(filter.skipParentRegistration, true);

    assert.equal(service.name, 'testFilter');
    assert.equal(service.skipParentRegistration, true);
    assert.deepEqual(service.dependencies, ['dep1', Dep2]);
    assert.equal(service.classz, FilterWithParameters);
  });

  it('should register filter with name as parameter', async function () {
    // given
    let classMetadata: ClassMetadata = ClassMetadata.getOrCreateClassMetadata(FilterWithNameAsParameter);
    let filter: FilterInfo = (<FilterAnnotation>classMetadata.getClassAnnotation(FilterAnnotation.className)).filterInfo;
    let service: ServiceInfo = (<ServiceAnnotation>classMetadata.getClassAnnotation(ServiceAnnotation.className)).serviceInfo;

    // then
    assert.equal(filter.name, 'namedFilter');
    assert.equal(filter.classz, FilterWithNameAsParameter);

    assert.equal(service.name, 'namedFilter');
    assert.equal(service.skipParentRegistration, null);
    assert.equal(service.dependencies, null);
    assert.equal(service.classz, FilterWithNameAsParameter);
  });

  @Filter
  class FilterWithoutParameters {
  }

  class Dep2 {
  }

  @Filter({name: 'testFilter', skipParentRegistration: true, dependencies: ['dep1', Dep2]})
  class FilterWithParameters {
  }

  @Filter('namedFilter')
  class FilterWithNameAsParameter {
  }

});